import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import * as TrustedIssuersRegistry from "../../contracts/TrustedIssuerRegistry.json";
import TrustedIssuersRegistryContract from "../types/trusted-issuers-registry.interface";

const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

@Injectable()
export default class LedgerService {
  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private tirContract: TrustedIssuersRegistryContract;

  private tirAddress: string;

  private tirInterface: ethers.utils.Interface;

  constructor(private configService: ConfigService) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider(
      `${this.configService.get<string>("ledger")}/blockchains/besu`
    );

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.tirInterface = new ethers.utils.Interface(TrustedIssuersRegistry.abi);
    this.tirAddress = this.configService.get<string>(
      "besuTrustedIssuersRegistryAddress"
    );

    const tirContractWithoutWallet = new ethers.Contract(
      this.tirAddress,
      TrustedIssuersRegistry.abi,
      this.ethersProvider
    );
    this.tirContract = (tirContractWithoutWallet.connect(
      this.ethersWallet
    ) as unknown) as TrustedIssuersRegistryContract;
  }

  getContract(): TrustedIssuersRegistryContract {
    return this.tirContract;
  }

  getAddress(): string {
    return this.tirAddress;
  }

  getInterface(): ethers.utils.Interface {
    return this.tirInterface;
  }

  getProvider(): ethers.providers.Provider | ethers.providers.JsonRpcProvider {
    return this.ethersProvider;
  }
}
