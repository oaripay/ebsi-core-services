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
    const url = new URL(this.configService.get<string>("besuRpcNode"));

    this.ethersProvider = new ethers.providers.JsonRpcProvider({
      url: url.href,
      user: url.username || undefined,
      password: url.password || undefined,
    });

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
