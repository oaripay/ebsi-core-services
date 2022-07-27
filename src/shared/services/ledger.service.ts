import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT } from "did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosError, AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import { ApiConfig } from "../../config/configuration";
import { PolicyRegistry, PolicyRegistry__factory } from "../../contracts";
import { logAxiosError } from "../utils";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private ethersProviderWithoutToken: ethers.providers.JsonRpcProvider;

  private tprContract: PolicyRegistry;

  private publicMethodsTprContract: PolicyRegistry;

  private tprAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  private domain: string;

  private localOrigin: string;

  private remoteLedgerApi: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.tprAddress = this.configService.get<string>("contractAddr");
    this.authorisationApiUrl = this.configService.get<string>(
      "authorisationApiUrl"
    );

    this.agent = new Agent({
      privateKey: this.configService.get<string>("apiPrivateKey"),
      name: this.configService.get<string>("apiName"),
      trustedAppsRegistry: `${this.configService.get<string>(
        "trustedAppsRegistryApiUrl"
      )}/apps`,
    });

    this.domain = this.configService.get<string>("domain");
    this.localOrigin = this.configService.get<string>("localOrigin");
    this.remoteLedgerApi = `${this.configService.get<string>(
      "ledgerApiUrl"
    )}/blockchains/besu`;
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

    const requestComponent = await this.agent.createRequest(
      this.configService.get<string>("ledgerApiName"),
      { nonce }
    );

    // Send request payload to Authorisation API
    try {
      const res = await axios.post<
        typeof requestComponent,
        AxiosResponse<AkeResponse>
      >(`${this.authorisationApiUrl}/oauth2-sessions`, requestComponent);

      const accessToken = await this.agent.verifyAkeResponse(res.data, {
        nonce,
      });

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

  private setupProvider(url: string, token?: string) {
    if (token) {
      this.ethersProvider = new ethers.providers.JsonRpcProvider({
        url,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
    } else {
      this.ethersProviderWithoutToken = new ethers.providers.JsonRpcProvider({
        url,
      });
    }
  }

  private async connectProvider(token?: string) {
    if (this.domain && this.localOrigin) {
      try {
        const localUrl = this.remoteLedgerApi.replace(
          this.domain,
          this.localOrigin
        );
        this.logger.debug(`Trying to connect to local Ledger API: ${localUrl}`);
        this.setupProvider(localUrl, token);
        await this.ethersProvider.getNetwork();
        this.logger.debug("Connected to local Ledger API");
      } catch (e) {
        this.logger.debug(
          `Falling back to remote Ledger API: ${this.remoteLedgerApi}`
        );
        this.setupProvider(this.remoteLedgerApi, token);
      }
    } else {
      this.logger.debug(`Using remote Ledger API: ${this.remoteLedgerApi}`);
      this.setupProvider(this.remoteLedgerApi, token);
    }
  }

  private async refreshConnection() {
    const token = await this.getAccessToken();

    await this.connectProvider(token);

    this.tprContract = PolicyRegistry__factory.connect(
      this.tprAddress,
      this.ethersProvider
    );
  }

  private async getPublicMethodsTprContract() {
    if (this.publicMethodsTprContract) {
      return this.publicMethodsTprContract;
    }

    await this.connectProvider();

    this.publicMethodsTprContract = PolicyRegistry__factory.connect(
      this.tprAddress,
      this.ethersProviderWithoutToken
    );

    return this.publicMethodsTprContract;
  }

  async getContract({ protectedMethod = false } = {}): Promise<PolicyRegistry> {
    if (protectedMethod) {
      await this.checkSession();
      return this.tprContract;
    }

    return this.getPublicMethodsTprContract();
  }

  getContractAddress() {
    return this.tprAddress;
  }
}

export default LedgerService;
