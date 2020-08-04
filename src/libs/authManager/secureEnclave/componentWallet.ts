import { JWT, JWK, JWKECKey } from "jose";
import { encrypt, decrypt } from "eciesjs";
import { ethers } from "ethers";
import Wallet, { WalletOptions } from "./wallet";
import { InternalServerError, ApiErrorMessages } from "../../../errors";
import getJWKfromHex from "./jwk";

export default class ComponentWallet implements Wallet {
  static async componentWalletBuilder(
    options?: WalletOptions
  ): Promise<ComponentWallet> {
    if (!options)
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: ApiErrorMessages.WALLET_OPTIONS_NOT_PROVIDED,
      });
    const wallet = new ComponentWallet();
    if (!options.hexPrivateKey)
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: ApiErrorMessages.COMPONENT_KEY_NOT_PROVIDED,
      });
    await wallet.loadFromPrivateKey(options.hexPrivateKey);

    return wallet;
  }

  ethAddress!: string;

  protected jwk!: JWK.ECKey;

  protected wallet!: ethers.Wallet;

  async loadFromPrivateKey(hexPrivateKey: string): Promise<ethers.Wallet> {
    const wallet = new ethers.Wallet(hexPrivateKey);
    this.wallet = wallet;
    this.ethAddress = wallet.address;
    const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
    this.jwk = getJWKfromHex(signingKey.publicKey, signingKey.privateKey);

    return wallet;
  }

  signJwt(payload: Buffer): string {
    const jws = JWT.sign(JSON.parse(payload.toString()), this.jwk, {
      header: {
        alg: "ES256K",
        typ: "JWT",
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

  toJWK(withPrivate = true): JWKECKey {
    return this.jwk.toJWK(withPrivate);
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
