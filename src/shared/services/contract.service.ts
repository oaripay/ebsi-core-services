import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import {
  LedgerSCRegistry,
  LedgerSCRegistry__factory,
} from "../../contracts/trusted-ledgers-sc";
import { prefixWith0x } from "../utils";

@Injectable()
export class ContractService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private ledgerScRegistryContract: LedgerSCRegistry;

  private ledgerScRegistryAddress: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.ledgerScRegistryAddress = this.configService.get<string>(
      "contractAddr"
    );

    this.ledgerScRegistryContract = LedgerSCRegistry__factory.connect(
      this.ledgerScRegistryAddress,
      this.ethersWallet
    );
  }

  getContract(): LedgerSCRegistry {
    return this.ledgerScRegistryContract;
  }
}

export default ContractService;
