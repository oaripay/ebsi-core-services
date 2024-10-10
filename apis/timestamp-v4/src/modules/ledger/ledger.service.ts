import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type WebSocket from "ws";
import { Timestamp, Timestamp__factory } from "@ebsiint-sc/timestamp-v2";
import { InternalServerError } from "@ebsiint-api/shared";
import { stringify } from "safe-stable-stringify";
import type { ApiConfig } from "../../config/configuration.js";

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

@Injectable()
export class LedgerService implements OnModuleDestroy {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider | undefined;

  private reconnectWebSocket = true;

  private timestampContract: Timestamp | undefined;

  private timestampAddress: string;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.timestampAddress = this.configService.get<string>("contractAddr");
    this.timeout = configService.get<number>("requestTimeout");
  }

  private initBesuProvider(): void {
    const besuRpcNode = this.configService.get<string>("besuRpcNode");

    if (!besuRpcNode || typeof besuRpcNode !== "string") {
      throw new Error("Invalid or missing BESU_RPC_NODE");
    }

    // Useful for local testing
    if (besuRpcNode.startsWith("http")) {
      const { origin, pathname, username, password } = new URL(besuRpcNode);
      this.ethersProvider = new ethers.providers.JsonRpcProvider({
        url: `${origin}${pathname}`,
        timeout: this.timeout,
        ...(username &&
          password && {
            user: username,
            password,
          }),
      });
      return;
    }

    this.ethersProvider = new ethers.providers.WebSocketProvider(besuRpcNode);

    /* global NodeJS */
    let pingTimeout: NodeJS.Timeout | null = null;
    let keepAliveInterval: NodeJS.Timeout | null = null;

    // Reconnect WS on accidental close
    // Inspired by https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-808736570

    // eslint-disable-next-line no-underscore-dangle
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
        `The ws connection was closed: ${stringify(err, null, 2)}`,
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

  private getEthersProvider() {
    if (!this.ethersProvider) {
      this.initBesuProvider();
    }
    return this.ethersProvider!;
  }

  getContract() {
    if (this.timestampContract) {
      return this.timestampContract;
    }

    const provider = this.getEthersProvider();

    this.timestampContract = Timestamp__factory.connect(
      this.timestampAddress,
      provider,
    );

    return this.timestampContract;
  }

  getContractAddress() {
    return this.timestampAddress;
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
}

export default LedgerService;
