import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import fs from "fs";
import path from "path";
import NodeRSA from "node-rsa";
import { EthersService } from "./ethers.service";

@Injectable()
export class AppService {
  private etherService;

  private key;

  constructor(
    private readonly ethersService: EthersService,
    private configService: ConfigService
  ) {}

  loadKey() {
    if (!this.key) {
      const privateKey = fs
        .readFileSync(path.resolve(__dirname, "../../key/private.pem"))
        .toString("utf-8");
      this.key = new NodeRSA(privateKey, "pkcs8");
    }

    return this.key;
  }

  generateLoginChallenge(name: string) {
    const timestamp =
      Date.now() + this.configService.get("AUTH_EXPIRE_TIME") * 60 * 1000;
    const challenge = `${name}.${timestamp}`;
    const key = this.loadKey();
    return key.encrypt(challenge, "base64");
  }

  async checkLogin(cryptedMessage, signature: string) {
    // Recover address from signature
    const address = EthersService.recoverAddress(cryptedMessage, signature);

    // Check if address is admin onchain
    const signer = await this.ethersService.getSigner();
    if (!signer || signer !== address) {
      throw new UnauthorizedException("your ether wallet is not authorized");
    }

    // Decrypt message
    const key = this.loadKey();
    const messageDecrypted = key.decrypt(cryptedMessage, "utf8");
    const messageDecryptedArray = messageDecrypted.split(".");

    // Check the date
    const currentTimestamp = Date.now();
    if (currentTimestamp > parseInt(messageDecryptedArray[1], 10)) {
      throw new UnauthorizedException("login expired");
    }

    // Return DID
    return messageDecryptedArray[0];
  }
}

export default AppService;
