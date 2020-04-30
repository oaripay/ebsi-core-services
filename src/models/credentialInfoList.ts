/* eslint-disable no-useless-constructor */

import { ICredentialInfo, ICredentialInfoList } from "../dtos/attributeInfo";
import { InternalError, BadRequestError } from "../errors";
import { ICredential } from "../daos/credential";
import KeyValueDataStorage from "../libs/dataStorages/keyValueDataStorage";

/**
 * Class to a Credential Data
 */
export default class CredentialInfoList extends KeyValueDataStorage {
  private static instance: CredentialInfoList;

  private constructor(walletDataStoreType: number) {
    super(walletDataStoreType);
  }

  public static getInstance(walletDataStoreType: number) {
    if (!this.instance) this.instance = new this(walletDataStoreType);
    return this.instance;
  }

  /**
   * Insert a new Credential Info to the List
   *
   * @param key User's DID to identify documents
   * @param value a new ICredentialInfo to be inserted to the list
   */
  async insertElem(key: string, value: ICredentialInfo): Promise<ICredential> {
    let iCredList: ICredentialInfoList;

    try {
      // we first get the list stored in the DB value (if it exists)
      iCredList = (await this.get(key)).data;
      try {
        // checks if the CredentialInfo already exists
        const { index, iCredInfo } = await this.getElem(key, value.id);
        // updates CredentialInfo List with the new value
        iCredList.list[index] = <ICredentialInfo>iCredInfo;
      } catch (error) {
        // value does not exist
        if (
          (<Error>error).message ===
          `Credential Info not found with this id: ${value.id}`
        ) {
          // push the new value (a sigle CredentialInfo) and insert the list again
          iCredList.list.push(value);
        } else {
          throw new InternalError("Error in getting a CredentialInfo element");
        }
      }
    } catch (error) {
      // In case list does not exist we create a new one
      // throw error when error is different from key not exist: 400
      if ((<Error>error).message !== "Request failed with status code 404") {
        throw new InternalError("Get from DB returned an error");
      }
      // create a new list
      iCredList = { list: [value] };
    }
    return this.insertValue({
      did: key,
      data: iCredList,
    });
  }

  /**
   * Inserts an element to the Data Storage
   * @param data Data to be inserted
   */
  async insertValue(data: ICredential): Promise<ICredential> {
    return super.insert(
      CredentialInfoList.setKey(data.did),
      JSON.parse(JSON.stringify(data.data))
    );
  }

  /**
   * Update a specific Credential Info from DB
   *
   * @param key User's DID to identify documents
   * @param value a new ICredentialInfo to be updated to the list
   */
  async updateElem(key: string, value: ICredentialInfo): Promise<ICredential> {
    // we first get the list stored in the DB value
    const iCredList: ICredentialInfoList = (await this.get(key)).data;
    // returns the index element (it already throws an error if not exists)
    const { index, iCredInfo } = await this.getElem(key, value.id);
    // updates CredentialInfo List with the new value
    iCredList.list[index] = <ICredentialInfo>iCredInfo;
    // inserts the new ICredentialInfoList
    return this.updateValue({
      did: key,
      data: iCredList,
    });
  }

  /**
   * Updates an already inserted element to the Data Storage
   * @param data Data to be updated
   */
  async updateValue(data: ICredential): Promise<ICredential> {
    // performs an Insert as it does the same behaviour as an update
    return super.update(
      CredentialInfoList.setKey(data.did),
      JSON.parse(JSON.stringify(data.data))
    );
  }

  /**
   * Deletes a specific Credential Info from DB
   *
   * @param key User's DID to identify documents
   * @param id a ICredentialInfo identifier
   */
  async deleteElem(key: string, id: string): Promise<void> {
    // we first get the list stored in the DB value
    const iCredList: ICredentialInfoList = (await this.get(key)).data;
    // returns the index element (it already throws an error if not exists)
    const { index } = await this.getElem(key, id);
    // removes CredentialInfo from the List
    delete iCredList.list[index];
    // inserts the new ICredential
    await this.insertValue({
      did: key,
      data: iCredList,
    });
  }

  /**
   * Deletes the whole Document Info List from DB
   *
   * @param key User's DID to identify documents
   */
  async delete(key: string): Promise<void> {
    await super.delete(CredentialInfoList.setKey(key));
  }

  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to retrieve
   */
  async get(key: string): Promise<ICredential> {
    const value = await super.get(CredentialInfoList.setKey(key));
    return {
      did: key,
      data: <ICredentialInfoList>JSON.parse(JSON.stringify(value)),
    };
  }

  /**
   * Retrieve a specific CredentialInfo from the list
   *
   * @param key User's DID to identify documents
   * @param id a ICredentialInfo identifier
   */
  async getElem(
    key: string,
    id: string
  ): Promise<{ index: number; iCredInfo: ICredentialInfo | undefined }> {
    // we first get the list stored in the DB value
    const iCredList: ICredentialInfoList = (await this.get(key)).data;
    // checks if list has elements
    if (iCredList.list[0] == null)
      throw new BadRequestError(
        `Credential Info not found with this id: ${id}`
      );
    // finds the index of the element
    const index: number = iCredList.list.findIndex((x) => x.id === id);
    // throws error if not found
    if (index === -1)
      throw new BadRequestError(
        `Credential Info not found with this id: ${id}`
      );
    // returns the element
    const iCredInfo = iCredList.list[index];
    // return the elem index and its value
    return { index, iCredInfo };
  }

  /**
   * Sets a unique key to avoid duplication on the same key value db storage
   *
   * @param key  User's DID to identify documents
   */
  private static setKey(key: string): string {
    // We generate a User's DID to identify documents + a identifier of docunents -
    // to avoid key matching with DIDs (credentials also are identified with a DID key)
    return `credentials-${key}`;
  }
}
