/* eslint-disable no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-useless-constructor */

import CASFile from "../../models/casFile";
import { WALLET_DATA_STORE_TYPE } from "../../config";
import CredentialInfoList from "../../models/credentialInfoList";

export default class DataStoreManager {
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
