import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";

import * as UniversitiesTrustedIssuers from "../contracts/UniversitiesTrustedIssuers.json";
import * as GovernmentsTrustedIssuers from "../contracts/GovernmentsTrustedIssuers.json";

@Injectable()
export default class EthersService {
  private ethersWallet;

  private ethersProvider;

  private univTrustedIssuersContract;

  private govTrustedIssuersContract;

  constructor() {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      process.env.PROVIDER
    );
    this.ethersWallet = new ethers.Wallet(
      process.env.WALLET_PRIV_KEY,
      this.ethersProvider
    );
    const univContractWithoutWallet = new ethers.Contract(
      process.env.UNIV_CONTRACT_ADDR,
      UniversitiesTrustedIssuers.abi,
      this.ethersProvider
    );
    const govContractWithoutWallet = new ethers.Contract(
      process.env.GOV_CONTRACT_ADDR,
      GovernmentsTrustedIssuers.abi,
      this.ethersProvider
    );

    this.univTrustedIssuersContract = univContractWithoutWallet.connect(
      this.ethersWallet
    );
    this.govTrustedIssuersContract = govContractWithoutWallet.connect(
      this.ethersWallet
    );
  }

  getContracts() {
    return {
      univContract: this.univTrustedIssuersContract,
      govContract: this.govTrustedIssuersContract
    };
  }

  recoverAddress(cryptedChallenge, signature) {
    return ethers.utils.verifyMessage(cryptedChallenge, signature);
  }
}
