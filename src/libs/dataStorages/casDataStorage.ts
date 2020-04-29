/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */

import IDataStorage from "./dataStorage";
import { getStorageConfig } from "../../utils/util";
import { WALLET_DATASTORE_CONFIG } from "../../config";
import { ICASFile } from "../../daos/casFile";
import { ICASStorageOut } from "../../dtos/dataStorage";
import AuthManager from "../authManager/authManager";

/**
 * Class to a Content Addressable Data Storage using EBSI API
 */
export default class CASDataStorage implements IDataStorage {
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
      `${this.uri}/store`,
      this.targetApp
    );
  }

  /**
   * Updates an already inserted element to the Data Storage
   * @param data Data to be inserted
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async update(data: any): Promise<any> {
    throw Error("Method not implemented on CASDataStorage");
  }

  /**
   * Deletes an element from the Data Storage
   * @param hash key to identify the element to delete
   */
  async delete(hash: string): Promise<any> {
    // the only database supportes is cassandra
    const database = "cassandra";
    return AuthManager.Instance.doPostCall(
      null,
      `${this.uri}/delete/${hash}/${database}`,
      this.targetApp
    );
  }

  /**
   * Retrieves an element from the Data Storage
   * @param key key to identify the element to retrieve
   */
  async get(hash: string): Promise<string> {
    const url = `${this.uri}/${hash}`;
    // add database as a parameter when it is set
    /* USING CASSANDRA AS DEFAULT
          if (this.database)
              url += '/' + this.database
          */
    return AuthManager.Instance.doGetCall(url, this.targetApp);
  }
}
