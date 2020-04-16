import Wallet, { WalletOptions } from "./secureEnclave/Wallet";

export enum KeyAlgorithm {
  EC,
  RSA,
}

export default interface SecureEnclave {
  enclaveDid: string;

  addNewWallet(options?: WalletOptions): Promise<string>;

  exportEncryptedKeys(did: string): string;

  signJwt(did: string, data: Buffer, password?: string): Promise<any>;

  init(encryptedKeystore: string): Promise<any>;

  restoreWallet(options?: WalletOptions): Promise<string>;

  getWallet(did: string): Wallet | undefined;

  getPublicKey(did: string): string;

  // encrypt data using Component public key
  encrypt(dataToEncrypt: Buffer): Buffer;

  // decrypt data using Component private key
  decrypt(dataToDecrypt: Buffer): Buffer;
  // eslint-disable-next-line semi
}
