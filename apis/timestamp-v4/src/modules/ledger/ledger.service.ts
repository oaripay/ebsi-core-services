import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { decodeJWT } from "did-jwt";
import axios, { AxiosResponse } from "axios";
import { Mutex } from "async-mutex";
import { Timestamp, Timestamp__factory } from "@ebsiint-sc/timestamp-v2";
import { logAxiosError, InternalServerError } from "@ebsiint-api/shared";
import { ApiConfig } from "../../config/configuration";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private ethersProviderWithoutToken: ethers.providers.JsonRpcProvider;

  private timestampContract: Timestamp;

  private publicMethodsTimestampContract: Timestamp;

  private timestampAddress: string;

  private accessTokenExp: number;

  private agent: Agent;

  private authorisationApiUrl: string;

  private domain: string;

  private localOrigin: string;

  private remoteLedgerApi: string;

  private timeout: number;

  private readonly publicProviderMutex: Mutex;

  private readonly privateProviderMutex: Mutex;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.timestampAddress = this.configService.get<string>("contractAddr");
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
        this.logger.debug(
          `Trying to connect to local Ledger API: ${localUrl} (${
            token ? "with" : "without"
          } access token)`
        );
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
    if (this.privateProviderMutex.isLocked()) {
      // A connection is already being made, wait until it's finished
      await this.privateProviderMutex.waitForUnlock();
    } else {
      // Create a new connection
      await this.privateProviderMutex.runExclusive(async () => {
        const token = await this.getAccessToken();

        await this.connectProvider(token);

        this.timestampContract = Timestamp__factory.connect(
          this.timestampAddress,
          this.ethersProvider
        );
      });
    }
  }

  private async getPublicMethodsTimestampContract() {
    if (this.publicMethodsTimestampContract) {
      return this.publicMethodsTimestampContract;
    }

    if (this.publicProviderMutex.isLocked()) {
      // A connection is already being made, wait until it's finished
      await this.publicProviderMutex.waitForUnlock();
    } else {
      // Create a new connection
      await this.publicProviderMutex.runExclusive(async () => {
        await this.connectProvider();

        this.publicMethodsTimestampContract = Timestamp__factory.connect(
          this.timestampAddress,
          this.ethersProviderWithoutToken
        );
      });
    }

    return this.publicMethodsTimestampContract;
  }

  async getContract({ protectedMethod = false } = {}): Promise<Timestamp> {
    if (protectedMethod) {
      await this.checkSession();
      return this.timestampContract;
    }

    return this.getPublicMethodsTimestampContract();
  }

  getContractAddress() {
    return this.timestampAddress;
  }
}

export default LedgerService;
