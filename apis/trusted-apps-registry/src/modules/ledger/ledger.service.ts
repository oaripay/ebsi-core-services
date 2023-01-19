import { URL } from "node:url";
import { InternalServerError } from "@ebsiint-api/shared";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type WebSocket from "ws";
import { Tar, Tar__factory } from "@ebsiint-sc/trusted-apps-registry";
import { ApiConfig } from "../../config/configuration";

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

@Injectable()
export default class LedgerService implements OnModuleDestroy {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private tarContract: Tar;

  private reconnectWebSocket = true;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.timeout = configService.get<number>("requestTimeout");
  }

  initProvider(): void {
    const besuRpcNode = this.getBesuRpcNode();

    if (!besuRpcNode || typeof besuRpcNode !== "string") {
      throw new Error("Invalid or missing BESU_RPC_NODE");
    }

    // Useful for local testing
    if (besuRpcNode.startsWith("http")) {
      const { origin, pathname, username, password } = new URL(besuRpcNode);

      this.ethersProvider = new ethers.providers.JsonRpcProvider({
        url: `${origin}${pathname}`,
        ...(username &&
          password && {
            user: username,
            password,
          }),
        timeout: this.timeout,
      });
    } else {
      this.ethersProvider = new ethers.providers.WebSocketProvider(besuRpcNode);

      // Reconnect WS on accidental close
      // Inspired by https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-808736570

      // eslint-disable-next-line no-underscore-dangle
      const websocket = (
        this.ethersProvider as ethers.providers.WebSocketProvider
      )._websocket as WebSocket;

      if (!websocket) {
        // Allow websocket to be undefined during tests
        if (process.env.NODE_ENV !== "test") {
          throw new InternalServerError(InternalServerError.defaultTitle, {
            detail:
              "Something went wrong when initializing the WebSocketProvider",
          });
        }
      } else {
        /* global NodeJS */
        let pingTimeout: NodeJS.Timeout | null = null;
        let keepAliveInterval: NodeJS.Timeout | null = null;

        websocket.on("open", () => {
          keepAliveInterval = setInterval(() => {
            websocket.ping();
            pingTimeout = setTimeout(
              () => websocket.terminate(),
              EXPECTED_PONG_BACK
            );
          }, KEEP_ALIVE_CHECK_INTERVAL);
        });

        websocket.on("close", (err: unknown) => {
          this.logger.error(
            `The ws connection was closed: ${JSON.stringify(err, null, 2)}`
          );

          if (this.tarContract) this.tarContract.removeAllListeners();
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          if (pingTimeout) clearTimeout(pingTimeout);

          if (this.reconnectWebSocket) {
            this.logger.log("Trying to reconnect");
            this.initProvider();
          }
        });

        websocket.on("pong", () => {
          if (pingTimeout) clearInterval(pingTimeout);
        });
      }
    }

    const tarAddress = this.configService.get<string>("contractAddr");
    this.tarContract = Tar__factory.connect(tarAddress, this.ethersProvider);
    this.tarContract.on("error", (err) => this.logger.error(err));
  }

  async onModuleDestroy(): Promise<void> {
    if (
      this.ethersProvider &&
      this.ethersProvider instanceof ethers.providers.WebSocketProvider &&
      this.ethersProvider.destroy
    ) {
      this.reconnectWebSocket = false;
      await this.ethersProvider.destroy();
    }
  }

  // Make it easier to override the config in tests
  getBesuRpcNode(): string {
    return this.configService.get<string>("besuRpcNode");
  }

  getContract(): Tar {
    if (!this.ethersProvider) {
      this.initProvider();
    }

    return this.tarContract;
  }
}
