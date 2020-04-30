/* eslint-disable no-useless-constructor */

import { IAttributeInfo, IAttributeInfoList } from "../dtos/attributeInfo";
import { InternalError, BadRequestError } from "../errors";
import { AttributeDAO } from "../daos/attribute";
import KeyValueDataStorage from "../libs/dataStorages/keyValueDataStorage";

/**
 * Class to a Credential Data
 */
export default class AttributeInfoList extends KeyValueDataStorage {
  private static instance: AttributeInfoList;

  private constructor(walletDataStoreType: number) {
    super(walletDataStoreType);
  }

  public static getInstance(walletDataStoreType: number) {
    if (!this.instance) this.instance = new this(walletDataStoreType);
    return this.instance;
  }

  /**
   * Insert a new Attribute Info to the List
   *
   * @param key User's DID to identify documents
   * @param value a new IAttributeInfo to be inserted to the list
   */
  async insertElem(key: string, value: IAttributeInfo): Promise<AttributeDAO> {
    let iAttributeList: IAttributeInfoList;

    try {
      // we first get the list stored in the DB value (if it exists)
      iAttributeList = (await this.get(key)).data;
      try {
        // checks if the AttributeInfo already exists
        const { index, iCredInfo } = await this.getElem(key, value.id);
        // updates AttributeInfo List with the new value
        iAttributeList.list[index] = <IAttributeInfo>iCredInfo;
      } catch (error) {
        // value does not exist
        if (
          (<Error>error).message ===
          `Attribute Info not found with this id: ${value.id}`
        ) {
          // push the new value (a sigle AttributeInfo) and insert the list again
          iAttributeList.list.push(value);
        } else {
          throw new InternalError("Error in getting a AttributeInfo element");
        }
      }
    } catch (error) {
      // In case list does not exist we create a new one
      // throw error when error is different from key not exist: 400
      if ((<Error>error).message !== "Request failed with status code 404") {
        throw new InternalError("Get from DB returned an error");
      }
      // create a new list
      iAttributeList = { list: [value] };
    }
    return this.insertValue({
      did: key,
      data: iAttributeList,
    });
  }

  /**
   * Inserts an element to the Data Storage
   * @param data Data to be inserted
   */
  async insertValue(data: AttributeDAO): Promise<AttributeDAO> {
    return super.insert(
      AttributeInfoList.setKey(data.did),
      JSON.parse(JSON.stringify(data.data))
    );
  }

  /**
   * Update a specific Attribute Info from DB
   *
   * @param key User's DID to identify documents
   * @param value a new IAttributeInfo to be updated to the list
   */
  async updateElem(key: string, value: IAttributeInfo): Promise<AttributeDAO> {
    // we first get the list stored in the DB value
    const iAttributeList: IAttributeInfoList = (await this.get(key)).data;
    // returns the index element (it already throws an error if not exists)
    const { index, iCredInfo } = await this.getElem(key, value.id);
    // updates AttributeInfo List with the new value
    iAttributeList.list[index] = <IAttributeInfo>iCredInfo;
    // inserts the new IAttributeInfoList
    return this.updateValue({
      did: key,
      data: iAttributeList,
    });
  }

  /**
   * Updates an already inserted element to the Data Storage
   * @param data Data to be updated
   */
  async updateValue(data: AttributeDAO): Promise<AttributeDAO> {
    // performs an Insert as it does the same behaviour as an update
    return super.update(
      AttributeInfoList.setKey(data.did),
      JSON.parse(JSON.stringify(data.data))
    );
  }

  /**
   * Deletes a specific Attribute Info from DB
   *
   * @param key User's DID to identify documents
   * @param id a IAttributeInfo identifier
   */
  async deleteElem(key: string, id: string): Promise<void> {
    // we first get the list stored in the DB value
    const iAttributeList: IAttributeInfoList = (await this.get(key)).data;
    // returns the index element (it already throws an error if not exists)
    const { index } = await this.getElem(key, id);
    // removes AttributeInfo from the List
    delete iAttributeList.list[index];
    // inserts the new AttributeDAO
    await this.insertValue({
      did: key,
      data: iAttributeList,
    });
  }

  /**
   * Deletes the whole Document Info List from DB
   *
   * @param key User's DID to identify documents
   */
  async delete(key: string): Promise<void> {
    await super.delete(AttributeInfoList.setKey(key));
  }

  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to retrieve
   */
  async get(key: string): Promise<AttributeDAO> {
    const value = await super.get(AttributeInfoList.setKey(key));
    return {
      did: key,
      data: <IAttributeInfoList>JSON.parse(JSON.stringify(value)),
    };
  }

  /**
   * Retrieve a specific AttributeInfo from the list
   *
   * @param key User's DID to identify documents
   * @param id a IAttributeInfo identifier
   */
  async getElem(
    key: string,
    id: string
  ): Promise<{ index: number; iCredInfo: IAttributeInfo | undefined }> {
    // we first get the list stored in the DB value
    const iAttributeList: IAttributeInfoList = (await this.get(key)).data;
    // checks if list has elements
    if (iAttributeList.list[0] == null)
      throw new BadRequestError(`Attribute Info not found with this id: ${id}`);
    // finds the index of the element
    const index: number = iAttributeList.list.findIndex((x) => x.id === id);
    // throws error if not found
    if (index === -1)
      throw new BadRequestError(`Attribute Info not found with this id: ${id}`);
    // returns the element
    const iCredInfo = iAttributeList.list[index];
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
