import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import {
  SchemaSCRegistry,
  SchemaSCRegistry__factory,
} from "../../contracts/trusted-schemas";
import { prefixWith0x } from "../utils";

@Injectable()
export class ContractService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private schemaSCRegistryContract: SchemaSCRegistry;

  private schemaSCRegistryAddress: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.schemaSCRegistryAddress = this.configService.get<string>(
      "contractAddr"
    );

    this.schemaSCRegistryContract = SchemaSCRegistry__factory.connect(
      this.schemaSCRegistryAddress,
      this.ethersWallet
    );
  }

  getContract(): SchemaSCRegistry {
    return this.schemaSCRegistryContract;
  }
}

export default ContractService;
