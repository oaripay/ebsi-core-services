import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import {
  DidRegistry,
  DidRegistry__factory,
} from "../../contracts/did-registry";
import { prefixWith0x } from "../utils";

@Injectable()
export class ContractService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private didRegistryContract: DidRegistry;

  private didRegistryAddress: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.didRegistryAddress = this.configService.get<string>("contractAddr");

    this.didRegistryContract = DidRegistry__factory.connect(
      this.didRegistryAddress,
      this.ethersWallet
    );
  }

  getContract(): DidRegistry {
    return this.didRegistryContract;
  }
}

export default ContractService;
