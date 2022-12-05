import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT } from "did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import {
  SchemaSCRegistry,
  SchemaSCRegistry__factory,
} from "@ebsiint-sc/trusted-schemas-registry";
import { logAxiosError } from "@ebsiint-api/shared";
import { ApiConfig } from "../../config/configuration";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private ethersProviderWithoutToken: ethers.providers.JsonRpcProvider;

  private tsrContract: SchemaSCRegistry;

  private publicMethodsTsrContract: SchemaSCRegistry;

  private tsrAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  private domain: string;

  private localOrigin: string;

  private remoteLedgerApi: string;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.tsrAddress = this.configService.get<string>("contractAddr");
    this.authorisationApiUrl = this.configService.get<string>(
      "authorisationApiUrl"
    );

    this.agent = new Agent({
      privateKey: configService.get<string>("apiPrivateKey"),
      name: configService.get<string>("apiName"),
      trustedAppsRegistry: `${configService.get<string>("tarApiUrl")}/apps`,
    });

    this.domain = this.configService.get<string>("domain");
    this.localOrigin = this.configService.get<string>("localOrigin");
    this.remoteLedgerApi = `${this.configService.get<string>(
      "ledgerApiUrl"
    )}/blockchains/besu`;
    this.timeout = configService.get<number>("requestTimeout");
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
      >(`${this.authorisationApiUrl}/oauth2-sessions`, requestComponent, {
        timeout: this.timeout,
      });

      const accessToken = await this.agent.verifyAkeResponse(res.data, {
        nonce,
        timeout: this.timeout,
      });

      const { payload } = decodeJWT(accessToken);
      this.accessTokenExp = payload.exp;

      return accessToken;
    } catch (err) {
      if (err instanceof Error) {
        if (axios.isAxiosError(err)) {
          logAxiosError(err, this.logger);
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
        timeout: this.timeout,
      });

      this.ethersProvider.on("debug", (...args) => {
        try {
          this.logger.debug(JSON.stringify(args[0], null, 2));
        } catch {
          // Ignore debug
        }
      });
    } else {
      this.ethersProviderWithoutToken = new ethers.providers.JsonRpcProvider({
        url,
        timeout: this.timeout,
      });

      this.ethersProviderWithoutToken.on("debug", (...args) => {
        try {
          this.logger.debug(JSON.stringify(args[0], null, 2));
        } catch {
          // Ignore debug
        }
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

    this.tsrContract = SchemaSCRegistry__factory.connect(
      this.tsrAddress,
      this.ethersProvider
    );
  }

  private async getPublicMethodsTsrContract() {
    if (this.publicMethodsTsrContract) {
      return this.publicMethodsTsrContract;
    }

    await this.connectProvider();

    this.publicMethodsTsrContract = SchemaSCRegistry__factory.connect(
      this.tsrAddress,
      this.ethersProviderWithoutToken
    );

    return this.publicMethodsTsrContract;
  }

  async getContract({
    protectedMethod = false,
  } = {}): Promise<SchemaSCRegistry> {
    if (protectedMethod) {
      await this.checkSession();
      return this.tsrContract;
    }

    return this.getPublicMethodsTsrContract();
  }

  getContractAddress() {
    return this.tsrAddress;
  }
}

export default ContractService;
