import { getStorageConfig } from "../../utils/Util";
import { WALLET_DATASTORE_CONFIG } from "../../config";
import { ICallResponse } from "../../dtos/messages";
import { AuthManager } from "../authManager";
import IDataStorage from "./dataStorage";

/**
 * Class to a Key Value Data Storage using EBSI API
 */
export default class KeyValueDataStorage implements IDataStorage {
  private uri: string;

  private targetApp: string;

  /**
   *
   * @param uri URI to call to the DB
   */
  public constructor(
    private walletDataStoreType: number,
    private iAuthManager: AuthManager = AuthManager.Instance
  ) {
    this.uri = getStorageConfig(walletDataStoreType)[
      WALLET_DATASTORE_CONFIG.URI
    ];
    this.targetApp = getStorageConfig(walletDataStoreType)[
      WALLET_DATASTORE_CONFIG.EBSI_APP_NAME
    ];
  }

  /**
   * Inserts an element to the Data Storage
   * @param data Data to be inserted
   */
  async insert(data: any): Promise<ICallResponse> {
    return this.iAuthManager.doPostCall(
      data,
      `${this.uri}/insert`,
      this.targetApp
    );
  }

  /**
   * Updates an already inserted element to the Data Storage
   * @param data Data to be inserted
   */
  async update(data: any): Promise<ICallResponse> {
    // performs an Insert as it does the same behaviour as an update
    return this.iAuthManager.doPostCall(
      data,
      `${this.uri}/insert`,
      this.targetApp
    );
  }

  /**
   * Deletes an element from the Data Storage
   * @param key key to identify the element to delete
   */
  async delete(key: string): Promise<ICallResponse> {
    return this.iAuthManager.doPostCall(
      { key },
      `${this.uri}/delete`,
      this.targetApp
    );
  }

  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to retrieve
   */
  async get(key: string): Promise<any> {
    return this.iAuthManager.doGetCall(`${this.uri}/${key}`, this.targetApp);
  }
}
