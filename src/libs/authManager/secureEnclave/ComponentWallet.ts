import { JWT, JWK } from "jose";
import { encrypt, decrypt } from "eciesjs";
import { ethers } from "ethers";
import { TransactionRequest } from "ethers/providers";
import * as config from "../../../config";
import * as util from "../../../utils/Util";
import { API_ERROR_MESSAGES } from "../../../errors";
import Wallet, { WalletOptions } from "./Wallet";
import { getJWKfromHex } from "./JWK";

export default class ComponentWallet implements Wallet {
  static async componentWalletBuilder(
    options?: WalletOptions
  ): Promise<ComponentWallet> {
    if (!options)
      throw new Error(API_ERROR_MESSAGES.WALLET_OPTIONS_NOT_PROVIDED);
    if (!options.password) {
      throw new Error("Password needs to be provided");
    }

    const wallet = new ComponentWallet();

    if (!options.encryptedKey)
      throw Error(
        API_ERROR_MESSAGES.COMPONENT_WALLET_ENCRYPTEDKEY_NOT_PROVIDED
      );
    await wallet.loadFromEncryptedKeys(options.encryptedKey, options.password);

    return wallet;
  }

  ethAddress: any;

  protected jwk!: JWK.ECKey;

  protected wallet!: ethers.Wallet;

  protected encryptedKey!: string;

  async initWithPass(password: string): Promise<void> {
    this.jwk = util.generateKeys();
    await this.initFromECKeys(this.jwk, password);
  }

  async initFromECKeys(jwk: JWK.ECKey, password: string): Promise<void> {
    this.wallet = new ethers.Wallet(util.toHex(<string>jwk.d));
    this.ethAddress = this.wallet.address;
    this.encryptedKey = await this.wallet.encrypt(password);
  }

  async loadFromEncryptedKeys(
    v3JsonWallet: string,
    password: string
  ): Promise<ethers.Wallet> {
    const wallet: ethers.Wallet = await ethers.Wallet.fromEncryptedJson(
      v3JsonWallet,
      password
    );

    this.wallet = wallet;
    this.ethAddress = wallet.address;
    this.encryptedKey = v3JsonWallet;
    const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
    this.jwk = getJWKfromHex(signingKey.publicKey, signingKey.privateKey);

    return wallet;
  }

  exportEncryptedKeys(): string {
    return this.encryptedKey;
  }

  signJwt(payload: Buffer): string {
    const jws = JWT.sign(JSON.parse(payload.toString()), this.jwk, {
      header: {
        alg: "ES256K",
        typ: "JWT",
        jku: `${config.EBSI_TRUSTED_APP_API_URI}/public-keys/`,
      },
    });

    return jws;
  }

  get publicKey(): string {
    return new ethers.utils.SigningKey(this.wallet.privateKey).publicKey;
  }

  get privateKey(): string {
    return this.wallet.privateKey;
  }

  hasJWK(): boolean {
    return JWK.isKey(this.jwk);
  }

  toJWK(): JWK.ECKey {
    return this.jwk;
  }

  async signTx(txJSON: TransactionRequest): Promise<string> {
    return this.wallet.sign(txJSON);
  }

  getDid(): string {
    return `did:ebsi:${this.ethAddress}`;
  }

  // encrypt data using Component public key
  encrypt(dataToEncrypt: Buffer): Buffer {
    return encrypt(this.publicKey, dataToEncrypt);
  }

  // decrypt data using Component private key
  decrypt(dataToDecrypt: Buffer): Buffer {
    return decrypt(this.privateKey, dataToDecrypt);
  }
}
