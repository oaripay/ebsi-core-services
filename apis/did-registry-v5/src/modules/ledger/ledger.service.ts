import type WebSocket from "ws";

import { InternalServerError } from "@ebsiint-api/shared";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v3";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { stringify } from "safe-stable-stringify";

import type { ApiConfig } from "../../config/configuration.js";

const EXPECTED_PONG_BACK = 15_000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

@Injectable()
export class LedgerService implements OnModuleDestroy {
  private didRegistryAddress: string;

  private didRegistryContract: DidRegistry | undefined;

  private ethersProvider: ethers.Provider | undefined;

  private readonly logger = new Logger(LedgerService.name);

  private reconnectWebSocket = true;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.didRegistryAddress = this.configService.get<string>("contractAddr");
    this.timeout = configService.get<number>("requestTimeout");
  }

  getContract() {
    if (this.didRegistryContract) {
      return this.didRegistryContract;
    }

    const provider = this.getEthersProvider();

    this.didRegistryContract = DidRegistry__factory.connect(
      this.didRegistryAddress,
      // @ts-expect-error Error due to contracts using CommonJS modules
      provider,
    );

    return this.didRegistryContract;
  }

  getContractAddress() {
    return this.didRegistryAddress;
  }

  getEthersProvider() {
    if (!this.ethersProvider) {
      this.initBesuProvider();
    }
    return this.ethersProvider!;
  }

  async onModuleDestroy() {
    if (
      this.ethersProvider &&
      this.ethersProvider instanceof ethers.WebSocketProvider &&
      this.ethersProvider.destroy
    ) {
      this.reconnectWebSocket = false;
      await this.ethersProvider.destroy();
    }
  }

  private initBesuProvider(): void {
    const besuRpcNode = this.configService.get<string>("besuRpcNode");

    if (!besuRpcNode || typeof besuRpcNode !== "string") {
      throw new Error("Invalid or missing BESU_RPC_NODE");
    }

    // Useful for local testing
    if (besuRpcNode.startsWith("http")) {
      const { origin, password, pathname, username } = new URL(besuRpcNode);
      const fetchRequest = new ethers.FetchRequest(`${origin}${pathname}`);
      fetchRequest.timeout = this.timeout;
      if (username && password) {
        fetchRequest.setCredentials(username, password);
      }
      this.ethersProvider = new ethers.JsonRpcProvider(
        fetchRequest,
        undefined,
        {
          batchMaxSize: 1, // Ledger API doesn't support batch request
          staticNetwork: true, // Do not request chain ID on requests to validate the underlying chain has not changed
        },
      );
      return;
    }

    this.ethersProvider = new ethers.WebSocketProvider(besuRpcNode);

    // Reconnect WS on accidental close
    // Inspired by https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-808736570

    const websocket = (this.ethersProvider as ethers.WebSocketProvider)
      .websocket as WebSocket;

    if (!websocket) {
      // Allow websocket to be undefined during unit tests
      if (process.env.NODE_ENV === "test") return;

      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Something went wrong when initializing the WebSocketProvider",
      });
    }

    // websocket.on("error", (err: unknown) => {
    //   console.log("websocket error", err);
    //   throw new InternalServerError(InternalServerError.defaultTitle, {
    //     detail: "Something went wrong when initializing the WebSocketProvider",
    //   });
    // });

    /* global NodeJS */
    let pingTimeout: NodeJS.Timeout;
    let keepAliveInterval: NodeJS.Timeout;

    websocket.on("open", () => {
      console.log("websocket open");

      keepAliveInterval = setInterval(() => {
        websocket.ping();
        pingTimeout = setTimeout(
          () => websocket.terminate(),
          EXPECTED_PONG_BACK,
        );
      }, KEEP_ALIVE_CHECK_INTERVAL);
    });

    websocket.on("close", (err: unknown) => {
      console.log("websocket closed", err);

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
