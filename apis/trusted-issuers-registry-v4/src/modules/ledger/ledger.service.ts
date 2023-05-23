import { randomUUID } from "node:crypto";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { InternalServerError, logAxiosError } from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import axios, { AxiosResponse } from "axios";
import { decodeJwt } from "jose";
import { Mutex } from "async-mutex";
import { Tir, Tir__factory } from "@ebsiint-sc/trusted-issuers-registry";
import { ApiConfig } from "../../config/configuration";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider?: ethers.providers.JsonRpcProvider;

  private ethersProviderWithoutToken?: ethers.providers.JsonRpcProvider;

  private tirContract?: Tir;

  private publicMethodsTirContract?: Tir;

  private readonly tirAddress: string;

  private accessTokenExp?: number;

  private readonly agent: Agent;

  private readonly authorisationApiV2Url: string;

  private readonly domain: string;

  private readonly localOrigin: string;

  private readonly remoteLedgerApi: string;

  private readonly timeout: number;

  private readonly publicProviderMutex: Mutex;

  private readonly privateProviderMutex: Mutex;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.tirAddress = this.configService.get<string>(
      "besuTrustedIssuersRegistryAddress"
    );
    this.authorisationApiV2Url = this.configService.get<string>(
      "authorisationApiV2Url"
    );

    this.agent = new Agent({
      privateKey: configService.get<string>("apiPrivateKey"),
      name: configService.get<string>("apiName"),
      trustedAppsRegistry: `${configService.get<string>(
        "trustedAppsRegistryApiUrl"
      )}/apps`,
    });

    this.domain = this.configService.get<string>("domain");
    this.localOrigin = this.configService.get<string>("localOrigin");
    this.remoteLedgerApi = `${this.configService.get<string>(
      "ledgerApiUrl"
    )}/blockchains/besu`;

    this.timeout = configService.get<number>("requestTimeout");
    this.publicProviderMutex = new Mutex();
    this.privateProviderMutex = new Mutex();
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
      >(`${this.authorisationApiV2Url}/oauth2-sessions`, requestComponent, {
        timeout: this.timeout,
      });

      const accessToken = await this.agent.verifyAkeResponse(res.data, {
        nonce,
        timeout: this.timeout,
      });

      const payload = decodeJwt(accessToken);
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

      return this.ethersProvider;
    }

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

    return this.ethersProviderWithoutToken;
  }

  private async connectProvider(token?: string) {
    if (this.domain && this.localOrigin) {
      try {
        const localUrl = this.remoteLedgerApi.replace(
          this.domain,
          this.localOrigin
        );
        this.logger.debug(
          `Trying to connect to local Ledger API: ${localUrl} (${
            token ? "with" : "without"
          } access token)`
        );
        const provider = this.setupProvider(localUrl, token);
        await provider.getNetwork();
        this.logger.debug("Connected to local Ledger API");
        return provider;
      } catch (e) {
        this.logger.debug(
          `Falling back to remote Ledger API: ${this.remoteLedgerApi}`
        );
        return this.setupProvider(this.remoteLedgerApi, token);
      }
    }

    this.logger.debug(`Using remote Ledger API: ${this.remoteLedgerApi}`);
    return this.setupProvider(this.remoteLedgerApi, token);
  }

  private async refreshConnection() {
    if (this.privateProviderMutex.isLocked()) {
      // A connection is already being made, wait until it's finished
      await this.privateProviderMutex.waitForUnlock();
    } else {
      // Create a new connection
      await this.privateProviderMutex.runExclusive(async () => {
        const token = await this.getAccessToken();
        const provider = await this.connectProvider(token);
        this.tirContract = Tir__factory.connect(this.tirAddress, provider);
      });
    }
  }

  private async getPublicMethodsTirContract() {
    if (this.publicMethodsTirContract) {
      return this.publicMethodsTirContract;
    }

    if (this.publicProviderMutex.isLocked()) {
      // A connection is already being made, wait until it's finished
      await this.publicProviderMutex.waitForUnlock();
    } else {
      // Create a new connection
      await this.publicProviderMutex.runExclusive(async () => {
        const provider = await this.connectProvider();
        this.publicMethodsTirContract = Tir__factory.connect(
          this.tirAddress,
          provider
        );
      });
    }

    return this.publicMethodsTirContract as unknown as Tir;
  }

  async getContract({ protectedMethod = false } = {}): Promise<Tir> {
    if (protectedMethod) {
      await this.checkSession();
      return this.tirContract as Tir; // Assume tirContract is not undefined
    }

    return this.getPublicMethodsTirContract();
  }

  getContractAddress() {
    return this.tirAddress;
  }
}

export default LedgerService;
