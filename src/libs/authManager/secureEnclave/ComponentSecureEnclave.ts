import { JWK } from "jose";
import * as config from "../../../config";
import { API_ERROR_MESSAGES, InternalError } from "../../../errors";
import Wallet, { WalletOptions } from "./Wallet";
import ComponentWallet from "./ComponentWallet";
import SecureEnclave from "../SecureEnclave";

/**
 * Class to a Secure Enclave
 */
export default class ComponentSecureEnclave implements SecureEnclave {
  protected static instance: ComponentSecureEnclave;

  protected wallets: Map<string, Wallet>;

  protected semaphore = false;

  protected EnclaveDid: string;

  protected constructor() {
    this.wallets = new Map<string, Wallet>();
    this.EnclaveDid = "";
  }

  /**
   * Returns an instance of the created SecureEnclave
   * Used when it is not known the constructor parameters, which
   * should be known only in the controller class
   */
  static get Instance(): SecureEnclave {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  get enclaveDid(): string {
    return this.EnclaveDid;
  }

  set enclaveDid(did: string) {
    this.EnclaveDid = did;
  }

  getWallet(did: string): Wallet | undefined {
    return this.wallets.get(did);
  }

  /**
   * Inits the enclave at startup.
   * Loads the enclave's wallet from keyDB if exists, otherwise it creates a new wallet (thus a new DID
   * for the component).
   *
   * @param encryptedKeystore, Optionally, keystore can be provided as input parameter.
   */
  async init(
    encryptedKeystore: string
  ): Promise<{ did: string; key: JWK.ECKey }> {
    if (this.semaphore)
      throw new InternalError(
        "Semaphore blocked, Enclave already being initialized"
      );

    // If Did exists, return it.
    if (this.enclaveDid !== "") {
      const key = (this.getWallet(this.enclaveDid) as ComponentWallet).toJWK();
      return { did: this.enclaveDid, key };
    }

    if (!encryptedKeystore)
      throw new InternalError(
        API_ERROR_MESSAGES.ERROR_ON_COMPONENT_WALLET_INIT
      );
    const did = await this.restoreWallet({
      encryptedKey: encryptedKeystore,
      password: config.COMPONENT_PASSWORD,
    });
    this.enclaveDid = did;
    const key = (this.getWallet(did) as ComponentWallet).toJWK();

    return { did, key };
  }

  /**
   * Adds a new wallet to the Enclave
   * @param options
   */
  async addNewWallet(options?: WalletOptions): Promise<string> {
    const wallet = await ComponentWallet.componentWalletBuilder(options);
    this.wallets.set(wallet.getDid(), wallet);
    return wallet.getDid();
  }

  /**
   * Restores a wallet from a JSON encrypted file
   * @param options
   */
  async restoreWallet(options?: WalletOptions): Promise<string> {
    return this.addNewWallet(options);
  }

  getPublicKey(did: string): string {
    const wallet = this.wallets.get(did);
    if (!wallet) throw new Error(API_ERROR_MESSAGES.WALLET_NOT_FOUND);

    return wallet.publicKey;
  }

  exportEncryptedKeys(did: string): string {
    const wallet = this.wallets.get(did);
    if (!wallet) throw new Error(API_ERROR_MESSAGES.WALLET_NOT_FOUND);

    return wallet.exportEncryptedKeys();
  }

  async signJwt(did: string, data: Buffer): Promise<any> {
    const wallet = this.wallets.get(did);
    if (!wallet) throw new Error(API_ERROR_MESSAGES.WALLET_NOT_FOUND);

    const response = await wallet.signJwt(data);
    return response;
  }

  // encrypt data using Component public key
  encrypt(dataToEncrypt: Buffer): Buffer {
    const wallet = this.getWallet(this.enclaveDid) as Wallet;
    return wallet.encrypt(dataToEncrypt);
  }

  // decrypt data using Component protected key
  decrypt(dataToDecrypt: Buffer): Buffer {
    const wallet = this.getWallet(this.enclaveDid) as Wallet;
    return wallet.decrypt(dataToDecrypt);
  }
}
