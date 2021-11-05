import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT } from "did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosError, AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import { ApiConfig } from "../../config/configuration";
import { LedgerSCRegistry, LedgerSCRegistry__factory } from "../../contracts";
import { prefixWith0x, logAxiosError } from "../utils";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  private ethersWallet: string | ethers.Signer | ethers.providers.Provider;

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private tirContract: LedgerSCRegistry;

  private tirAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.tirAddress = this.configService.get<string>("contractAddr");
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
    const nonce = randomUUID();

    const requestComponent = await this.agent.createRequestPayload(
      this.configService.get<string>("ledgerApiName"),
      { nonce }
    );

    // Send request payload to Authorisation API
    try {
      const res = await axios.post<
        typeof requestComponent,
        AxiosResponse<AkeResponse>
      >(`${this.authorisationApiUrl}/oauth2-sessions`, requestComponent);

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

  private setupProvider(url: string, token: string) {
    this.ethersProvider = new ethers.providers.JsonRpcProvider({
      url,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  }

  private async refreshConnection() {
    const token = await this.getAccessToken();

    const domain = this.configService.get<string>("domain");
    const localOrigin = this.configService.get<string>("localOrigin");
    const remoteLedgerApi = `${this.configService.get<string>(
      "ledgerApiUrl"
    )}/blockchains/besu`;

    if (domain && localOrigin) {
      try {
        const localUrl = remoteLedgerApi.replace(domain, localOrigin);
        this.logger.debug(`Trying to connect to local Ledger API: ${localUrl}`);
        this.setupProvider(localUrl, token);
        await this.ethersProvider.getNetwork();
        this.logger.debug("Connected to local Ledger API");
      } catch (e) {
        this.logger.debug(
          `Falling back to remote Ledger API: ${remoteLedgerApi}`
        );
        this.setupProvider(remoteLedgerApi, token);
      }
    } else {
      this.logger.debug(`Using remote Ledger API: ${remoteLedgerApi}`);
      this.setupProvider(remoteLedgerApi, token);
    }

    this.ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.tirContract = LedgerSCRegistry__factory.connect(
      this.tirAddress,
      this.ethersWallet
    );
  }

  async getContract(): Promise<LedgerSCRegistry> {
    await this.checkSession();
    return this.tirContract;
  }
}

export default ContractService;
