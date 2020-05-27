import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jose from "jose";
import fs from "fs";
import path from "path";
import NodeRSA from "node-rsa";
import { EthersService } from "./ethers.service";

@Injectable()
export class AppService {
  private jwt: {
    decode: (token: string) => object;
    verify: (jwt: string, key: jose.ConsumeKeyInput) => string | object;
    sign: (
      payload: string | Buffer | object,
      key: jose.ProduceKeyInput
    ) => string;
  };

  private etherService;

  private key:
    | jose.JWK.RSAKey
    | jose.JWK.ECKey
    | jose.JWK.OKPKey
    | jose.JWK.OctKey;

  constructor(
    private readonly ethersService: EthersService,
    private configService: ConfigService
  ) {
    this.jwt = jose.JWT;
    this.ethersService = ethersService;
    this.configService = configService;
  }

  static base64Buffer(key: string) {
    return Buffer.from(key, "base64").toString("utf8");
  }

  static asKey(key: string) {
    return jose.JWK.asKey(key);
  }

  sign(payload: string | Buffer | object) {
    return this.jwt.sign(payload, this.key);
  }

  verify(jwt: string, key: jose.ConsumeKeyInput) {
    return this.jwt.verify(jwt, key || this.key);
  }

  decode(token: string) {
    return this.jwt.decode(token);
  }

  // eslint-disable-next-line class-methods-use-this
  generateLoginChallenge(name: string) {
    const timestamp =
      Date.now() + this.configService.get("AUTH_EXPIRE_TIME") * 60 * 1000;
    const challenge = `${name}.${timestamp}`;
    const key = AppService.loadKey();
    return key.encrypt(challenge, "base64");
  }

  static loadKey() {
    const privateKey = fs
      .readFileSync(path.resolve(__dirname, "../../../key/private.pem"))
      .toString("utf-8");
    return new NodeRSA(privateKey, "pkcs8");
  }

  static async decryptChallenge(encryptedChallenge: string) {
    const key = AppService.loadKey();
    return key.decrypt(encryptedChallenge, "utf8");
  }

  async checkLogin(cryptedMessage, signature: string) {
    // recover address from signature
    const address = await EthersService.recoverAddress(
      cryptedMessage,
      signature
    );
    // check address is admin onchain
    const signer = await this.ethersService.getSigner();
    if (!signer || signer !== address) {
      throw new UnauthorizedException("your ether wallet is not authorized");
    }
    // decrypt message
    const messageDecrypted = await AppService.decryptChallenge(cryptedMessage);
    const messageDecryptedArray = messageDecrypted.split(".");
    // check the date
    const currentTimestamp = Date.now();
    if (currentTimestamp > parseInt(messageDecryptedArray[1], 10)) {
      throw new UnauthorizedException("login expired");
    }
    // return DID
    return messageDecryptedArray[0];
  }
}

export default AppService;
