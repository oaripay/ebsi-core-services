export interface WalletOptions {
  encryptedKey?: string; // can be validated with ethers' isSecretStorageWallet method
  password?: string;
  did?: string;
}

export default interface Wallet {
  publicKey: string;
  ethAddress?: string;

  /**
   * Sign the data and creates a JWS with the current key
   * @param data Data to be signed with the current key. Should be a VC JSON object
   */
  signJwt(
    data: Buffer,
    password?: string,
    expiresIn?: number
  ): Promise<any> | any;

  /**
   * Verify the data signed
   * @param data : The JWS signed
   */

  signTx(txJSON: any, password?: string): Promise<any>;

  getDid(): string;

  exportEncryptedKeys(): string;

  // encrypt data using Component public key
  encrypt(dataToEncrypt: Buffer): Buffer;

  // decrypt data using Component private key
  decrypt(dataToDecrypt: Buffer): Buffer;
}
