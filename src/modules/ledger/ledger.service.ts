import { Agent } from "@cef-ebsi/oauth2-auth";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT } from "@cef-ebsi/did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosError } from "axios";
import { v4 as uuidV4 } from "uuid";
import { ApiConfig } from "../../config/configuration";
import {
  DidRegistry,
  DidRegistry__factory,
} from "../../contracts/did-registry";
import { prefixWith0x, logAxiosError } from "../../shared/utils";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private didRegistryContract: DidRegistry;

  private didRegistryAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.didRegistryAddress = this.configService.get<string>("contractAddr");
    this.authorisationApiUrl = this.configService.get<string>(
      "authorisationApiUrl"
    );

    const kid = this.configService.get<string>("apiKid");
    const privKey = this.configService.get<string>("apiPrivateKey");

    this.agent = new Agent(privKey, {
      issuer: this.configService.get<string>("apiName"),
      kid,
    });
  }

  private async checkSession(): Promise<void> {
    if (
      !this.accessTokenExp ||
      Date.now() + REFRESH_LIMIT > this.accessTokenExp * 1000
    ) {
      await this.refreshConnection();
    }
  }

  private async getAccessToken() {
    const nonce = uuidV4();

    const requestComponent = await this.agent.createRequestPayload(
      this.configService.get<string>("ledgerApiName"),
      { nonce }
    );

    // Send request payload to Authorisation API
    try {
      const res = await axios.post(
        `${this.authorisationApiUrl}/oauth2-sessions`,
        requestComponent
      );

      const accessToken = await this.agent.verifyAuthenticationResponse(
        res.data,
        nonce
      );

      const { payload } = decodeJWT(accessToken);
      this.accessTokenExp = payload.exp;

      return accessToken;
    } catch (err) {
      if (err instanceof Error) {
        if ((err as AxiosError).isAxiosError) {
          logAxiosError(err as AxiosError, this.logger);
        } else {
          this.logger.error(err.message, err.stack);
        }
      } else {
        this.logger.error(err);
      }
      throw new InternalServerError();
    }
  }

  private async refreshConnection() {
    const token = await this.getAccessToken();

    this.ethersProvider = new ethers.providers.JsonRpcProvider({
      url: `${this.configService.get<string>("ledgerApiUrl")}/blockchains/besu`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.didRegistryContract = DidRegistry__factory.connect(
      this.didRegistryAddress,
      this.ethersWallet
    );
  }

  async getContract(): Promise<DidRegistry> {
    await this.checkSession();
    return this.didRegistryContract;
  }
}

export default LedgerService;
