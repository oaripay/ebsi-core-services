import CASFile from "../../models/casFile";
import { WALLET_DATA_STORE_TYPE } from "../../config";
import AttributeInfoList from "../../models/attributeInfoList";

export default class DataStoreManager {
  private static instance: DataStoreManager;

  private privAtttributeFileDB!: CASFile;

  private privAttributeInfoListDB!: AttributeInfoList;

  private privAttributeDBType = "cassandra";

  public static get Instance(): DataStoreManager {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /** ************************************** */
  /* Key Value Data Base Storage Instances */
  /** ************************************** */

  public get attributeInfoListDB(): AttributeInfoList {
    if (!this.privAttributeInfoListDB) {
      this.privAttributeInfoListDB = AttributeInfoList.getInstance(
        WALLET_DATA_STORE_TYPE.ATTRIBUTES_INFO_LIST_STORAGE
      );
    }
    return this.privAttributeInfoListDB;
  }

  /** ************************************** */
  /* CAS File Data Base Storage Instances */
  /** ************************************** */

  public get attributeFileDB(): CASFile {
    if (!this.privAtttributeFileDB) {
      this.privAtttributeFileDB = CASFile.getInstance(
        WALLET_DATA_STORE_TYPE.ATTRIBUTES_FILE_STORAGE,
        this.privAttributeDBType
      );
    }
    return this.privAtttributeFileDB;
  }
}
