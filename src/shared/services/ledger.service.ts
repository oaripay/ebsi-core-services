import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import { Tir, Tir__factory } from "../../contracts";
import { prefixWith0x } from "../utils";

@Injectable()
export default class LedgerService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private tirContract: Tir;

  private tirAddress: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.tirAddress = this.configService.get<string>(
      "besuTrustedIssuersRegistryAddress"
    );

    this.tirContract = Tir__factory.connect(this.tirAddress, this.ethersWallet);
  }

  getContract(): Tir {
    return this.tirContract;
  }
}
