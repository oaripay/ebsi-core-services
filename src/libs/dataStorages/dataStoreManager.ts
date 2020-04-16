/* eslint-disable no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-useless-constructor */

import CASFile from "src/models/casFile";
import { WALLET_DATA_STORE_TYPE } from "src/config";
import CredentialInfoList from "src/models/credentialInfoList";

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IDataStoreManager {
  // Key-Value Data Storage
  credInfoListDB: CredentialInfoList;
  // CAS File Data Storage
  credentialFileDB: CASFile;
  // eslint-disable-next-line semi
}

export class DataStoreManager implements IDataStoreManager {
  private static instance: DataStoreManager;

  private privCredentialFileDB!: CASFile;

  private privCredInfoListDB!: CredentialInfoList;

  private privCredentialDBType = "cassandra";

  private constructor() {}

  public static get Instance(): DataStoreManager {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /** ************************************** */
  /* Key Value Data Base Storage Instances */
  /** ************************************** */

  public get credInfoListDB(): CredentialInfoList {
    if (!this.privCredInfoListDB) {
      this.privCredInfoListDB = CredentialInfoList.getInstance(
        WALLET_DATA_STORE_TYPE.CREDINFOLIST_STORAGE
      );
    }
    return this.privCredInfoListDB;
  }

  /** ************************************** */
  /* CAS File Data Base Storage Instances */
  /** ************************************** */

  public get credentialFileDB(): CASFile {
    if (!this.privCredentialFileDB) {
      this.privCredentialFileDB = CASFile.getInstance(
        WALLET_DATA_STORE_TYPE.CREDENTIALFILE_STORAGE,
        this.privCredentialDBType
      );
    }
    return this.privCredentialFileDB;
  }
}
