import equal from "fast-deep-equal";
import {
  IAttribute,
  IAttributeInfo,
  IAttributeInput,
} from "../../dtos/attributeInfo";
import AttributeInfoList from "../../models/attributeInfoList";
import CASFile from "../../models/casFile";
import { ICASFile } from "../../daos/casFile";
import { EBSI_DEFAULT_DATA_STORE } from "../../config";
import { DataStoreManager } from "../dataStorages";
import { ICASStorageOut } from "../../dtos/dataStorage";
import {
  InternalError,
  API_ERROR_MESSAGES,
  EBSI_API_ERRORS,
  BadRequestError,
  NotFoundError,
} from "../../errors";
import { AttributeDAO } from "../../daos/attribute";

export default class IDHub {
  private static instance: IDHub;

  private constructor(
    private attributeInfoListDB: AttributeInfoList = DataStoreManager.Instance
      .attributeInfoListDB,
    private attributeFileDB: CASFile = DataStoreManager.Instance.attributeFileDB
  ) {}

  static get Instance() {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /**
   * Retrieves all attributes objects stored in user's ID Hub
   */
  async getAttributes(did: string): Promise<IAttribute[]> {
    try {
      const attrInfoList = (await this.attributeInfoListDB.get(did)).data;
      const attributes: IAttribute[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for (const elem of attrInfoList.list) {
        // eslint-disable-next-line no-await-in-loop
        const base64 = await this.attributeFileDB.get(elem.hash);
        attributes.push({ ...elem, data: { base64 } });
      }

      return attributes;
    } catch (error) {
      if ((<Error>error).message !== "Request failed with status code 404") {
        throw error;
      }
      // creates an empty list and inserts it
      await this.attributeInfoListDB.insertValue({ did, data: { list: [] } });
      return [];
    }
  }

  async getAttributesFiltered(
    did: string,
    filterArr: string[] | string[][]
  ): Promise<IAttribute[]> {
    const attributes: IAttribute[] = await this.getAttributes(did);
    // returns a list of attributes that contains any of the filtered attributes in as type element
    // filter Array is empty returns an empty array
    if (filterArr.length <= 0) return [];
    // filter Array is an array of string arrays
    if (Array.isArray(filterArr[0])) {
      const resultAttributes = attributes.filter((attribute) =>
        attribute.type.some((typeElem) =>
          (filterArr as string[][]).some((filterElemArr) =>
            filterElemArr.indexOf(typeElem)
          )
        )
      );
      return resultAttributes;
    }
    // otherwiese, filter Array is an array of string
    const resultAttributes = attributes.filter((attribute) =>
      attribute.type.some(
        (typeElem) => (filterArr as string[]).indexOf(typeElem) > -1
      )
    );
    return resultAttributes;
  }

  /**
   * Retrieves a specific attribute file stored in user's ID Hub
   * @param did's Wallet DID
   * @param hash attribute hash to identify it
   */
  async getAttribute(did: string, hash: string): Promise<IAttribute> {
    const attributes = await this.getAttributes(did);
    return IDHub.getElemByHash(hash, attributes);
  }

  /**
   * Stores the specified credential to DID's ID HUB and its associated metadata to the DID's AttributeInfoList
   * @param did attribute's did owner
   * @param iAttributeInput Necessary data to store a attribute File to ID Hub and its correspondent AttributeInfo to the DID's AttributeInfoList
   */
  async setAttribute(
    did: string,
    hash: string,
    attributeInput: IAttributeInput
  ): Promise<{ attribute: IAttribute; newAttribute: boolean }> {
    // stores the Attribute File
    const file: ICASFile = {
      fileData: attributeInput.data.base64,
      fileName: `${attributeInput.id}.attribute`,
      database: EBSI_DEFAULT_DATA_STORE,
    };
    const { newAttribute } = await this.addAttributeFile(file, hash);

    const attributeInfo: IAttributeInfo = {
      id: attributeInput.id,
      type: attributeInput.type,
      hash,
      name: attributeInput.name,
      did,
    };
    // compares if already stored attribute's info is the same as provided
    if (!newAttribute) {
      const tmpAttribute = { ...attributeInfo };
      delete tmpAttribute.id;
      if (!equal(tmpAttribute, await this.getAttributeInfo(did, hash)))
        throw new InternalError(API_ERROR_MESSAGES.ATTRIBUTES_MISMATCH);
    }
    // we add attribute info only when it is a new attribute
    if (newAttribute) await this.addAttributeInfo(did, attributeInfo);
    return {
      attribute: {
        ...attributeInfo,
        data: attributeInput.data,
      },
      newAttribute,
    };
  }

  private async getAttributeInfo(
    did: string,
    hash: string
  ): Promise<IAttributeInfo> {
    const desiredAttribute = await this.getAttribute(did, hash);
    delete desiredAttribute.data;
    delete desiredAttribute.id;
    return desiredAttribute;
  }

  /**
   * Adds a specific credential file to user's ID Hub (or the specified database)
   */
  private async addAttributeFile(
    file: ICASFile,
    inHash: string
  ): Promise<{ hash: string; newAttribute: boolean }> {
    // tries to add attribute file, if it exists, returns the same hash indicating so
    try {
      const response: ICASStorageOut = await this.attributeFileDB.insert(file);
      if (!response || !response.hash)
        throw new InternalError(API_ERROR_MESSAGES.ERROR_STORING_FILE);
      if (response.hash !== inHash)
        throw new InternalError(API_ERROR_MESSAGES.HASH_MISMATCH);
      const newAttribute = true;
      return { hash: response.hash, newAttribute };
    } catch (error) {
      if (
        (error as Error).message.includes(EBSI_API_ERRORS.BAD_REQUEST) ||
        ((error as BadRequestError).Detail &&
          (error as BadRequestError).Detail.includes(
            "This file is already stored with name"
          ))
      ) {
        const newAttribute = false;
        return { hash: inHash, newAttribute };
      }
      throw error;
    }
  }

  /**
   * Adda a new AttributeInfo to the DID's AttributeInfoList
   * @param did Session ID between the front-end and backend wallet
   * @param IAttributeInfo the new IAttributeInfo to be inserted in the list
   */
  private async addAttributeInfo(
    did: string,
    attributeInfo: IAttributeInfo
  ): Promise<AttributeDAO> {
    // adds a new element to the list -> it checks if list exists, and creates a new one
    return this.attributeInfoListDB.insertElem(did, attributeInfo);
  }

  private static getElemByHash(
    hash: string,
    attributes: IAttribute[]
  ): IAttribute {
    // checks if list has elements
    if (!attributes.length)
      throw new NotFoundError(
        `Attribute Info not found with this hash: ${hash}`
      );
    // finds the index of the element
    const index: number = attributes.findIndex((x) => x.hash === hash);
    // throws error if not found
    if (index === -1)
      throw new NotFoundError(
        `Attribute Info not found with this hash: ${hash}`
      );
    // returns the element
    return attributes[index];
  }
}
