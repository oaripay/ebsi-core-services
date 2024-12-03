import type WebSocket from "ws";

import { InternalServerError } from "@ebsiint-api/shared";
import {
  TrustedIssuersRegistry,
  TrustedIssuersRegistry__factory,
} from "@ebsiint-sc/trusted-issuers-registry-v4";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { stringify } from "safe-stable-stringify";

import type { ApiConfig } from "../../config/configuration.js";

const EXPECTED_PONG_BACK = 15_000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

@Injectable()
export class LedgerService implements OnModuleDestroy {
  private contract: TrustedIssuersRegistry | undefined;

  private contractAddress: string;

  private ethersProvider: ethers.providers.JsonRpcProvider | undefined;

  private readonly logger = new Logger(LedgerService.name);

  private reconnectWebSocket = true;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.contractAddress = this.configService.get<string>(
      "besuTrustedIssuersRegistryAddress",
    );
    this.timeout = configService.get<number>("requestTimeout");
  }

  getContract() {
    if (this.contract) {
      return this.contract;
    }

    const provider = this.getEthersProvider();

    this.contract = TrustedIssuersRegistry__factory.connect(
      this.contractAddress,
      provider,
    );

    return this.contract;
  }

  getContractAddress() {
    return this.contractAddress;
  }

  async onModuleDestroy() {
    if (
      this.ethersProvider &&
      this.ethersProvider instanceof ethers.providers.WebSocketProvider &&
      this.ethersProvider.destroy
    ) {
      this.reconnectWebSocket = false;
      await this.ethersProvider.destroy();
    }
  }

  private getEthersProvider() {
    if (!this.ethersProvider) {
      this.initBesuProvider();
    }
    return this.ethersProvider!;
  }

  private initBesuProvider(): void {
    const besuRpcNode = this.configService.get<string>("besuRpcNode");

    if (!besuRpcNode || typeof besuRpcNode !== "string") {
      throw new Error("Invalid or missing BESU_RPC_NODE");
    }

    // Useful for local testing
    if (besuRpcNode.startsWith("http")) {
      const { origin, password, pathname, username } = new URL(besuRpcNode);
      this.ethersProvider = new ethers.providers.JsonRpcProvider({
        timeout: this.timeout,
        url: `${origin}${pathname}`,
        ...(username &&
          password && {
            password,
            user: username,
          }),
      });
      return;
    }

    this.ethersProvider = new ethers.providers.WebSocketProvider(besuRpcNode);

    /* global NodeJS */
    let pingTimeout: NodeJS.Timeout;
    let keepAliveInterval: NodeJS.Timeout;

    // Reconnect WS on accidental close
    // Inspired by https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-808736570

    const websocket = (
      this.ethersProvider as ethers.providers.WebSocketProvider
    )._websocket as WebSocket;

    if (!websocket) {
      // Allow websocket to be undefined during unit tests
      if (process.env.NODE_ENV === "test") return;

      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Something went wrong when initializing the WebSocketProvider",
      });
    }

    websocket.on("open", () => {
      keepAliveInterval = setInterval(() => {
        websocket.ping();
        pingTimeout = setTimeout(
          () => websocket.terminate(),
          EXPECTED_PONG_BACK,
        );
      }, KEEP_ALIVE_CHECK_INTERVAL);
    });

    websocket.on("close", (err: unknown) => {
      this.logger.warn(
        `The ws connection was closed: ${stringify(err, undefined, 2)}`,
      );

      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (pingTimeout) clearTimeout(pingTimeout);

      if (this.reconnectWebSocket) {
        this.logger.log("Trying to reconnect");
        this.initBesuProvider();
      }
    });

    websocket.on("pong", () => {
      if (pingTimeout) clearInterval(pingTimeout);
    });
  }
}

export default LedgerService;
