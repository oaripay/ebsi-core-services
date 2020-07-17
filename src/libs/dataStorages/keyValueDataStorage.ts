import AuthManager from "../authManager/authManager";
import { getStorageConfig } from "../../utils/util";
import { WalletDataStoreConfig } from "../../config";

/**
 * Class to a Key Value Data Storage using EBSI API
 */
export default class KeyValueDataStorage {
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
    this.uri = getStorageConfig(walletDataStoreType)[WalletDataStoreConfig.URI];
    this.targetApp = getStorageConfig(walletDataStoreType)[
      WalletDataStoreConfig.EBSI_APP_NAME
    ];
  }

  /**
   * Inserts an element to the Data Storage
   * @param data Data to be inserted
   */
  async insert(key: string, data: any): Promise<any> {
    return this.iAuthManager.doPutCall(
      data,
      `${this.uri}/${key}`,
      this.targetApp
    );
  }

  /**
   * Updates an already inserted element to the Data Storage
   * @param data Data to be inserted
   */
  async update(key: string, data: any): Promise<any> {
    // performs an Insert as it does the same behaviour as an update
    return this.iAuthManager.doPutCall(
      data,
      `${this.uri}/${key}`,
      this.targetApp
    );
  }

  /**
   * Deletes an element from the Data Storage
   * @param key key to identify the element to delete
   */
  async delete(key: string): Promise<void> {
    await this.iAuthManager.doDeleteCall(`${this.uri}/${key}`, this.targetApp);
  }

  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to retrieve
   */
  async get(key: string): Promise<any> {
    return this.iAuthManager.doGetCall(`${this.uri}/${key}`, this.targetApp);
  }
}
