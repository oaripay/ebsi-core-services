import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import type { ApiConfig } from "./config/configuration.js";

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  private readonly ledgerApiUrl: string;

  private readonly authorisationApiUrl: string;

  private readonly axiosClient: AxiosInstance;

  private readonly domain: string;

  private readonly localOrigin: string;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.ledgerApiUrl = configService.get<string>("ledgerApiUrl");
    this.authorisationApiUrl = configService.get<string>("authorisationApiUrl");
    this.domain = configService.get<string>("domain");
    this.localOrigin = configService.get<string>("localOrigin");

    const axiosRetryDelay = configService.get<number>("axiosRetryDelay");
    this.axiosClient = axios.create();

    axiosRetry(this.axiosClient, {
      retries: 30, // Retry 30 times (with a delay of 10s -> ~5 minutes)
      retryDelay: () => axiosRetryDelay, // Default: every 10 seconds
      retryCondition: () => true, // Ignore error response, retry anyway
      onRetry: (_, error, requestConfig) => {
        if (error.response) {
          // The request was made and the server responded with a status code that falls out of the range of 2xx
          this.logger.error({
            url: requestConfig.url,
            status: error.response.status,
            data: error.response.data,
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          this.logger.error({ url: requestConfig.url, message: error.message });
        }
      },
    });
  }

  async check(serviceUrl: string) {
    const url = this.localOrigin
      ? serviceUrl.replace(this.domain, this.localOrigin)
      : serviceUrl;

    try {
      await this.axiosClient.get(`${url}/health`);
    } catch {
      // If after all the attempts the URL is still not reachable, throw an error
      throw new Error(`Unable to get ${url}/health, shutting down...`);
    }
  }

  async onApplicationBootstrap() {
    // Wait for dependencies to be up and running
    this.logger.debug("Checking dependencies...");

    await this.check(this.ledgerApiUrl);
    await this.check(this.authorisationApiUrl);

    // Let's go!
    this.logger.debug("All the dependencies are ready");
  }
}

export default AppService;
