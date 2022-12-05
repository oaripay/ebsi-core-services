import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT } from "did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import {
  LedgerSCRegistry,
  LedgerSCRegistry__factory,
} from "@ebsiint-sc/trusted-ledgers-registry";
import { logAxiosError } from "@ebsiint-api/shared";
import { ApiConfig } from "../../config/configuration";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private ethersProviderWithoutToken: ethers.providers.JsonRpcProvider;

  private tlscrContract: LedgerSCRegistry;

  private publicMethodsTlscrContract: LedgerSCRegistry;

  private tlscrAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  private domain: string;

  private localOrigin: string;

  private remoteLedgerApi: string;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.tlscrAddress = this.configService.get<string>("contractAddr");
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
          if (typeof args[0] === "object" && "error" in args[0]) {
            this.logger.debug(JSON.stringify(args[0]));
          }
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
          if (typeof args[0] === "object" && "error" in args[0]) {
            this.logger.debug(JSON.stringify(args[0]));
          }
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
        if (token) {
          await this.ethersProvider.getNetwork();
        } else {
          await this.ethersProviderWithoutToken.getNetwork();
        }
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

    this.tlscrContract = LedgerSCRegistry__factory.connect(
      this.tlscrAddress,
      this.ethersProvider
    );
  }

  private async getPublicMethodsTlscrContract() {
    if (this.publicMethodsTlscrContract) {
      return this.publicMethodsTlscrContract;
    }

    await this.connectProvider();

    this.publicMethodsTlscrContract = LedgerSCRegistry__factory.connect(
      this.tlscrAddress,
      this.ethersProviderWithoutToken
    );

    return this.publicMethodsTlscrContract;
  }

  async getContract({
    protectedMethod = false,
  } = {}): Promise<LedgerSCRegistry> {
    if (protectedMethod) {
      await this.checkSession();
      return this.tlscrContract;
    }

    return this.getPublicMethodsTlscrContract();
  }

  getContractAddress() {
    return this.tlscrAddress;
  }
}

export default ContractService;
