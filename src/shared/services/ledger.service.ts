import { Agent } from "@cef-ebsi/oauth2-auth";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT } from "@cef-ebsi/did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosError } from "axios";
import { v4 as uuidV4 } from "uuid";
import { ApiConfig } from "../../config/configuration";
import { Tir, Tir__factory } from "../../contracts";
import { prefixWith0x, logAxiosError } from "../utils";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private tirContract: Tir;

  private tirAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.tirAddress = this.configService.get<string>(
      "besuTrustedIssuersRegistryAddress"
    );
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

    this.tirContract = Tir__factory.connect(this.tirAddress, this.ethersWallet);
  }

  async getContract(): Promise<Tir> {
    await this.checkSession();
    return this.tirContract;
  }
}

export default LedgerService;
