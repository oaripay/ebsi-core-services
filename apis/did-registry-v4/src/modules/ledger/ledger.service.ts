import { randomUUID } from "node:crypto";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { decodeJWT } from "did-jwt";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosResponse } from "axios";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v4";
import {
  DidRegistry as DidRegistryV3,
  DidRegistry__factory as DidRegistryV3__factory,
} from "@ebsiint-sc/did-registry";
import { logAxiosError, InternalServerError } from "@ebsiint-api/shared";
import { ApiConfig } from "../../config/configuration";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private ethersProviderWithoutToken: ethers.providers.JsonRpcProvider;

  private didRegistryContract: DidRegistry;

  private publicMethodsDidRegistryContract: DidRegistry;

  private publicMethodsDidRegistryV3Contract: DidRegistryV3;

  private didRegistryAddress: string;

  private didRegistryV3Address: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  private domain: string;

  private localOrigin: string;

  private remoteLedgerApi: string;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.didRegistryAddress = this.configService.get<string>("contractAddr");
    this.didRegistryV3Address =
      this.configService.get<string>("contractAddrV3");
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

    this.didRegistryContract = DidRegistry__factory.connect(
      this.didRegistryAddress,
      this.ethersProvider
    );
  }

  private async getPublicMethodsDidRegistryContract() {
    if (this.publicMethodsDidRegistryContract) {
      return this.publicMethodsDidRegistryContract;
    }

    await this.connectProvider();

    this.publicMethodsDidRegistryContract = DidRegistry__factory.connect(
      this.didRegistryAddress,
      this.ethersProviderWithoutToken
    );

    return this.publicMethodsDidRegistryContract;
  }

  private async getPublicMethodsDidRegistryV3Contract() {
    if (this.publicMethodsDidRegistryV3Contract) {
      return this.publicMethodsDidRegistryV3Contract;
    }

    await this.connectProvider();

    this.publicMethodsDidRegistryV3Contract = DidRegistryV3__factory.connect(
      this.didRegistryV3Address,
      this.ethersProviderWithoutToken
    );

    return this.publicMethodsDidRegistryV3Contract;
  }

  async getContract({ protectedMethod = false } = {}): Promise<DidRegistry> {
    if (protectedMethod) {
      await this.checkSession();
      return this.didRegistryContract;
    }

    return this.getPublicMethodsDidRegistryContract();
  }

  async getContractV3(): Promise<DidRegistryV3> {
    return this.getPublicMethodsDidRegistryV3Contract();
  }

  getContractAddress() {
    return this.didRegistryAddress;
  }
}

export default LedgerService;
