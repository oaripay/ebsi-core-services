import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jose from "jose";
import fs from "fs";
import path from "path";
import NodeRSA from "node-rsa";
import { EthersService } from "./ethers.service";

function loadKey() {
  const privateKey = fs
    .readFileSync(path.resolve(__dirname, "../../../key/private.pem"))
    .toString("utf-8");
  return new NodeRSA(privateKey, "pkcs8");
}

@Injectable()
export class AppService {
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
    this.ethersService = ethersService;
    this.configService = configService;
  }

  sign(payload: object) {
    return jose.JWT.sign(payload, this.key);
  }

  verify(jwt: string, key: jose.ConsumeKeyInput) {
    return jose.JWT.verify(jwt, key || this.key);
  }

  generateLoginChallenge(name: string) {
    const timestamp =
      Date.now() + this.configService.get("AUTH_EXPIRE_TIME") * 60 * 1000;
    const challenge = `${name}.${timestamp}`;
    const key = loadKey();
    return key.encrypt(challenge, "base64");
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
    const key = loadKey();
    const messageDecrypted = key.decrypt(cryptedMessage, "utf8");
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
