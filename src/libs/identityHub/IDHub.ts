/* eslint-disable no-empty-function */
/* eslint-disable no-useless-constructor */

import { ICallResponse } from "src/dtos/messages";
import {
  ICredentialInfoList,
  ICredentialOut,
  ICredentialInfo,
  IAttributeInput,
} from "src/dtos/attributeInfo";
import CredentiaInfoList from "src/models/credentialInfoList";
import CASFile from "src/models/casFile";
import { ICASFile } from "src/daos/casFile";
import { EBSI_DEFAULT_DATA_STORE } from "src/config";
import {
  setCredId,
  setId,
  setCredIssuer,
  setCredType,
  setCredName,
} from "src/utils/Util";
import { DataStoreManager } from "../dataStorages/dataStoreManager";

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IIDHub {
  setAttribute(
    did: string,
    iAttributeInput: IAttributeInput
  ): Promise<ICallResponse>;

  getAttributes(did: string): Promise<ICredentialInfoList>;

  getAttributesFiltered(
    did: string,
    filter: string[]
  ): Promise<ICredentialInfoList>;

  getAttribute(did: string, hash: string): Promise<ICredentialOut>;
  // eslint-disable-next-line semi
}

export class IDHub implements IIDHub {
  private static instance: IDHub;

  private constructor(
    private credInfoListDB: CredentiaInfoList = DataStoreManager.Instance
      .credInfoListDB,
    private credFileDB: CASFile = DataStoreManager.Instance.credentialFileDB
  ) {}

  static get Instance() {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /**
   * Retrieves all Credentials objects stored in user's ID Hub
   * @param bondId Session ID between the front-end and backend wallet
   */
  async getAttributes(did: string): Promise<ICredentialInfoList> {
    try {
      return (await this.credInfoListDB.get(did)).data;
    } catch (error) {
      if ((<Error>error).message !== "Request failed with status code 404") {
        throw Error("Could not retrieve a CredentialInfoList");
      }
      // creates an empty list and inserts it
      await this.credInfoListDB.insert({ did, data: { list: [] } });
      return (await this.credInfoListDB.get(did)).data;
    }
  }

  async getAttributesFiltered(
    did: string,
    filter: string[]
  ): Promise<ICredentialInfoList> {
    const attributeList: ICredentialInfoList = await this.getAttributes(did);
    const resultList: ICredentialInfoList = { list: [] };

    attributeList.list.forEach((elem) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const filterElem of filter) {
        if (elem.type.includes(filterElem)) {
          resultList.list.push(elem);
          break;
        }
      }
    });
    return resultList;
  }

  /**
   * Retrieves a specific Credential file stored in user's ID Hub
   * @param did's Wallet DID
   * @param hash Credential hash to identify it
   */
  async getAttribute(did: string, hash: string): Promise<ICredentialOut> {
    let data = await this.credFileDB.get(hash);
    // remove ebsi-uuid from the data file
    data = IDHub.deletePrefix(data);
    const iCredInfo = await this.getAttributeInfo(did, hash);

    return {
      id: iCredInfo.id,
      type: iCredInfo.type,
      hash: iCredInfo.hash,
      data: { base64: data },
      name: iCredInfo.name,
      issuer: iCredInfo.issuer,
    };
  }

  /**
   * Stores the specified credential to DID's ID HUB and its associated metadata to the DID's CredentialInfoList
   * @param did Session ID between the front-end and backend wallet
   * @param iAttributeInput Necessary data to store a Credential File to ID Hub and its correspondent CredentialInfo to the DID's CredentialInfoList
   */
  async setAttribute(
    did: string,
    iAttributeInput: IAttributeInput
  ): Promise<ICallResponse> {
    // stores the Credential File
    const iCredentialFile: ICASFile = {
      fileData: iAttributeInput.data.base64,
      fileName: iAttributeInput.id,
      database: EBSI_DEFAULT_DATA_STORE,
    };
    const fileHash = await this.addAttributeFile(did, iCredentialFile);
    // stores the correspondent Credential Info
    const issuer =
      setCredIssuer(iAttributeInput.id, iAttributeInput.data.base64) ||
      iAttributeInput.issuer;
    const iCredentialInfo: ICredentialInfo = {
      id: setCredId(),
      type: setCredType(iAttributeInput.id),
      hash: fileHash,
      name: setCredName(iAttributeInput.id, iAttributeInput.data.base64),
      issuer,
    };
    return {
      ...(await this.addCredentialInfo(did, iCredentialInfo)),
      hash: fileHash,
    };
  }

  private async getAttributeInfo(
    did: string,
    hash: string
  ): Promise<ICredentialInfo> {
    const iCredInfoList = await this.getAttributes(did);
    return IDHub.getElemByHash(hash, iCredInfoList);
  }

  /**
   * Adds a specific credential file to user's ID Hub (or the specified database)
   * @param did Session ID between the front-end and backend wallet. We require this to be sure the call is coming from an authenticated user
   * @param iCredentialFile Credential data File to be stored to the specified database
   */
  private async addAttributeFile(
    did: string,
    inCredentialFile: ICASFile
  ): Promise<string> {
    // to avoid duplicate files, we add a random prefix
    const iCredentialFile = IDHub.addPrefix(inCredentialFile);
    // add a Credential to ID Hub
    const response = await this.credFileDB.insert(iCredentialFile);
    // check response and return file hash
    if (!response || !response.hash) {
      throw Error(
        `Document File ${iCredentialFile.fileName} could not be added to ${iCredentialFile.database}`
      );
    }
    return response.hash;
  }

  /**
   * Adda a new CredentialInfo to the DID's CredentialInfoList
   * @param did Session ID between the front-end and backend wallet
   * @param iCredentialInfo the new ICredentialInfo to be inserted in the list
   */
  private async addCredentialInfo(
    did: string,
    iCredentialInfo: ICredentialInfo
  ): Promise<ICallResponse> {
    // adds a new element to the list -> it checks if list exists, and creates a new one
    return this.credInfoListDB.insertElem(did, iCredentialInfo);
  }

  private static getElemByHash(
    hash: string,
    iCredList: ICredentialInfoList
  ): ICredentialInfo {
    // checks if list has elements
    if (iCredList.list[0] == null)
      throw Error(`Credential Info not found with this hash: ${hash}`);
    // finds the index of the element
    const index: number = iCredList.list.findIndex((x) => x.hash === hash);
    // throws error if not found
    if (index === -1)
      throw Error(`Credential Info not found with this hash: ${hash}`);
    // returns the element
    return iCredList.list[index];
  }

  private static addPrefix(inFile: ICASFile): ICASFile {
    const prefix = setId("ebsi");
    const file = inFile;
    file.fileData = `${prefix}:${inFile.fileData}`;
    return file;
  }

  private static deletePrefix(data: string): string {
    // delete the 42 initial characters of the prefix set
    // ebsi-uuid:
    return data.substring(42);
  }
}
