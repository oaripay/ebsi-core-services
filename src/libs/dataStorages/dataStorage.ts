/**
 * Data Storage Interface
 */
export default interface IDataStorage {
  /**
   * Inserts an element to the Data Storage
   * @param data Data to be inserted
   * @param uri complete URL of the API REST call
   */
  insert(data: any, uri: string): Promise<any>;
  /**
   * Updates an already inserted element to the Data Storage
   * @param data Data to be inserted
   * @param uri complete URL of the API REST call
   */
  update(data: any, uri: string): Promise<any>;
  /**
   * Deletes an element from the Data Storage
   * @param key key to identify the element to delete
   * @param uri complete URL of the API REST call
   */
  delete(key: string, uri: string): Promise<any>;
  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to delete
   * @param uri complete URL of the API REST call
   */
  get(key: string, uri: string): Promise<any>;
}
