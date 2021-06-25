import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import WebSocket from "ws";
import { ApiConfig } from "../../config/configuration";
import { Tar__factory } from "../../contracts/factories/Tar__factory";
import { Tar } from "../../contracts/Tar";
import { prefixWith0x } from "../../shared/utils";

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

@Injectable()
export default class LedgerService implements OnModuleDestroy {
  private readonly logger = new Logger(LedgerService.name);

  private ethersProvider: ethers.providers.WebSocketProvider;

  private tarContract: Tar;

  private reconnectWebSocket = true;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.init();
  }

  init(): void {
    let pingTimeout: NodeJS.Timeout | null = null;
    let keepAliveInterval: NodeJS.Timeout | null = null;

    const besuRpcNode = this.configService.get<string>("besuRpcNode");
    const tarAddress = this.configService.get<string>("contractAddr");

    this.ethersProvider = new ethers.providers.WebSocketProvider(besuRpcNode);

    const ethersWallet = new ethers.Wallet(
      prefixWith0x(this.configService.get<string>("apiPrivateKey")),
      this.ethersProvider
    );

    this.tarContract = Tar__factory.connect(tarAddress, ethersWallet);
    this.tarContract.on("error", (err) => this.logger.error(err));

    // Reconnect WS on accidental close
    // Inspired by https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-808736570

    // eslint-disable-next-line no-underscore-dangle
    const websocket = this.ethersProvider._websocket as WebSocket;

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
        this.init();
      }
    });

    websocket.on("pong", () => {
      if (pingTimeout) clearInterval(pingTimeout);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ethersProvider && this.ethersProvider.destroy) {
      this.reconnectWebSocket = false;
      await this.ethersProvider.destroy();
    }
  }

  getContract(): Tar {
    return this.tarContract;
  }
}
