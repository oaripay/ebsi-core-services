import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import Web3 from "web3";
import * as EBSIApplicationRegistry from "../contracts/EBSIApplicationRegistry.json";

@Injectable()
export class EthersService {
  private ethersWallet;

  private contract;

  private ethersProvider;

  private contractWithSigner;

  private signer;

  private web3;

  private readonly logger = new Logger(EthersService.name);

  constructor(private configService: ConfigService) {
    this.configService = configService;
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      this.configService.get("WEB3_PROVIDER"),
      { name: "besu", chainId: 6971 }
    );
    this.contract = new ethers.Contract(
      this.configService.get("CONTRACT_ADDR"),
      EBSIApplicationRegistry.abi,
      this.ethersProvider
    );
    this.ethersWallet = new ethers.Wallet(
      this.configService.get("WALLET_PRIV_KEY"),
      this.ethersProvider
    );
    this.contractWithSigner = this.contract.connect(this.ethersWallet);
    this.signer = this.contractWithSigner.owner();
    this.web3 = new Web3(this.configService.get("WEB3_PROVIDER"));
  }

  async getSigner() {
    return this.signer;
  }

  async getApplicationPublicKey(appName: string) {
    return this.contractWithSigner.getApplicationPublicKey(appName);
  }

  async getApplicationKeys() {
    return this.contractWithSigner.getApplicationKeys();
  }

  async getApplicationByKey(key: string) {
    return this.contractWithSigner.getApplicationByKey(key);
  }

  async getAuthorizedApps(appName: string) {
    return this.contractWithSigner.getAuthorizedApps(appName);
  }

  async addApplication(pubKey: string, name: string) {
    const addApp = await this.contractWithSigner.addApplication(pubKey, name);
    return addApp.wait();
  }

  async addNewAuthorization(
    appName: string,
    authName: string,
    status: boolean
  ) {
    const authorize = await this.contractWithSigner.addNewAuthorization(
      appName,
      authName,
      status
    );
    return authorize.wait();
  }

  static recoverAddress(cryptedChallenge, signature) {
    return ethers.utils.verifyMessage(cryptedChallenge, signature);
  }

  async revertMessage(txHash) {
    const tx = await this.web3.eth.getTransactionReceipt(txHash);

    this.logger.debug(tx);
    if (!tx) {
      this.logger.debug("tx not found");
      return null;
    }

    return this.web3.toAscii(tx.revertReason.substr(138));
  }
}

export default EthersService;
