import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import * as UniversitiesTrustedIssuers from "../contracts/UniversitiesTrustedIssuers.json";
import * as GovernmentsTrustedIssuers from "../contracts/GovernmentsTrustedIssuers.json";

@Injectable()
export default class EthersService {
  private ethersWallet;

  private ethersProvider;

  private univTrustedIssuersContract;

  private govTrustedIssuersContract;

  constructor(private configService: ConfigService) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      this.configService.get("PROVIDER")
    );
    this.ethersWallet = new ethers.Wallet(
      this.configService.get("APP_PRIVATE_KEY"),
      this.ethersProvider
    );
    const univContractWithoutWallet = new ethers.Contract(
      this.configService.get("UNIV_CONTRACT_ADDR"),
      UniversitiesTrustedIssuers.abi,
      this.ethersProvider
    );
    const govContractWithoutWallet = new ethers.Contract(
      this.configService.get("GOV_CONTRACT_ADDR"),
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
