import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import { Timestamp, Timestamp__factory } from "../../contracts";
import { prefixWith0x } from "../utils";

@Injectable()
export default class LedgerService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private timestampContract: Timestamp;

  private timestampAddress: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.timestampAddress = this.configService.get<string>("contractAddr");

    this.timestampContract = Timestamp__factory.connect(
      this.timestampAddress,
      this.ethersWallet
    );
  }

  getContract(): Timestamp {
    return this.timestampContract;
  }
}
