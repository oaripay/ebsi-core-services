/* eslint-disable no-useless-constructor */

import CASDataStorage from "../libs/dataStorages/casDataStorage";

/**
 * Class to a CASFile Data
 */
export default class CASFile extends CASDataStorage {
  private static instance: CASFile;

  private constructor(walletDataStoreType: number, database?: string) {
    super(walletDataStoreType, database);
  }

  public static getInstance(walletDataStoreType: number, database?: string) {
    if (!this.instance) this.instance = new this(walletDataStoreType, database);
    return this.instance;
  }
}
