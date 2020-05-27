import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import Web3 from "web3";

import * as EBSIApplicationRegistry from "../contracts/EBSIApplicationRegistry.json";
import config from "../config";

function hexToAscii(str1) {
  const hex = str1.toString();
  let str = "";
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

@Injectable()
export class EthersService {
  private ethersWallet;

  private contract;

  private ethersProvider;

  private contractWithSigner;

  private signer;

  private web3;

  constructor() {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      config.WEB3_PROVIDER,
      { name: "besu", chainId: 6971 }
    );
    this.contract = new ethers.Contract(
      config.CONTRACT_ADDR,
      EBSIApplicationRegistry.abi,
      this.ethersProvider
    );
    this.ethersWallet = new ethers.Wallet(
      config.WALLET_PRIV_KEY,
      this.ethersProvider
    );
    this.contractWithSigner = this.contract.connect(this.ethersWallet);
    this.signer = this.contractWithSigner.owner();
    this.web3 = new Web3(config.WEB3_PROVIDER);
  }

  getContract() {
    return this.contractWithSigner;
  }

  async getSigner() {
    return this.signer;
  }

  getApplicationPublicKey(appName: string) {
    return this.contractWithSigner.getApplicationPublicKey(appName);
  }

  getApplicationKeys() {
    return this.contractWithSigner.getApplicationKeys();
  }

  getApplicationByKey(key: string) {
    return this.contractWithSigner.getApplicationByKey(key);
  }

  getAuthorizedApps(appName: string) {
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

  // eslint-disable-next-line class-methods-use-this
  recoverAddress(cryptedChallenge, signature) {
    return ethers.utils.verifyMessage(cryptedChallenge, signature);
  }

  async revertMessage(txHash) {
    const tx = await this.web3.eth.getTransactionReceipt(txHash);

    console.log(tx);
    if (!tx) {
      console.log("tx not found");
      return null;
    }

    return hexToAscii(tx.revertReason.substr(138));
  }
}

export default EthersService;
