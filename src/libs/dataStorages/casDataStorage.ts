import AuthManager from "../authManager/authManager";
import { getStorageConfig } from "../../utils/util";
import { WALLET_DATASTORE_CONFIG } from "../../config";
import { ICASFile } from "../../daos/casFile";
import { ICASStorageOut } from "../../dtos/dataStorage";

/**
 * Class to a Content Addressable Data Storage using EBSI API
 */
export default class CASDataStorage {
  private uri: string;

  private targetApp: string;

  /**
   *
   * @param uri URI to call to the DB
   * @param database name of the database. Supported values: "mongo", "cassandra", "gluster-fs"
   */
  public constructor(
    private walletDataStoreType: number,
    private database?: string
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
  async insert(data: ICASFile): Promise<ICASStorageOut> {
    return AuthManager.Instance.doPostFormCall(
      data,
      `${this.uri}`,
      this.targetApp
    );
  }

  /**
   * Deletes an element from the Data Storage
   * @param hash key to identify the element to delete
   */
  async delete(hash: string): Promise<void> {
    await AuthManager.Instance.doDeleteCall(
      `${this.uri}/${hash}`,
      this.targetApp
    );
  }

  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to retrieve
   */
  async get(hash: string): Promise<string> {
    const url = `${this.uri}/${hash}`;
    return AuthManager.Instance.doGetCall(url, this.targetApp);
  }
}
