/* eslint-disable no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-useless-constructor */

import CASFile from "../../models/casFile";
import { WALLET_DATA_STORE_TYPE } from "../../config";
import AttributeInfoList from "../../models/attributeInfoList";

export default class DataStoreManager {
  private static instance: DataStoreManager;

  private privAtttributeFileDB!: CASFile;

  private privCredInfoListDB!: AttributeInfoList;

  private privAttributeDBType = "cassandra";

  private constructor() {}

  public static get Instance(): DataStoreManager {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /** ************************************** */
  /* Key Value Data Base Storage Instances */
  /** ************************************** */

  public get credInfoListDB(): AttributeInfoList {
    if (!this.privCredInfoListDB) {
      this.privCredInfoListDB = AttributeInfoList.getInstance(
        WALLET_DATA_STORE_TYPE.CREDINFOLIST_STORAGE
      );
    }
    return this.privCredInfoListDB;
  }

  /** ************************************** */
  /* CAS File Data Base Storage Instances */
  /** ************************************** */

  public get attributeFileDB(): CASFile {
    if (!this.privAtttributeFileDB) {
      this.privAtttributeFileDB = CASFile.getInstance(
        WALLET_DATA_STORE_TYPE.CREDENTIALFILE_STORAGE,
        this.privAttributeDBType
      );
    }
    return this.privAtttributeFileDB;
  }
}
