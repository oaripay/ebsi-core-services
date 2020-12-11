import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import { Tar__factory } from "../../contracts/factories/Tar__factory";
import { Tar } from "../../contracts/Tar";
import { prefixWith0x } from "../utils";

@Injectable()
export default class LedgerService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private tarContract: Tar;

  private tarAddress: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.tarAddress = this.configService.get<string>("contractAddr");

    this.tarContract = Tar__factory.connect(this.tarAddress, this.ethersWallet);
  }

  getContract(): Tar {
    return this.tarContract;
  }
}
