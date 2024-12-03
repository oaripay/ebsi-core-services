import type WebSocket from "ws";

import { InternalServerError } from "@ebsiint-api/shared";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { URL } from "node:url";
import { stringify } from "safe-stable-stringify";

import type { ApiConfig } from "../../config/configuration.js";

import { BesuResponseObject, BesuServiceResponse } from "./besu.interface.js";
import { BesuDto } from "./dto/index.js";

const EXPECTED_PONG_BACK = 15_000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

interface JsonRpcResponseError extends Error {
  body: string;
  code: string;
  headers: Record<string, unknown>;
  reason: string;
  requestBody: string;
  requestMethod: string;
  status: number;
  url: string;
}

interface WsResponse {
  code: number;
  response: string;
}

function isJsonRpcResponseError(value: unknown): value is JsonRpcResponseError {
  if (!(value instanceof Error) || !value || typeof value !== "object") {
    return false;
  }

  // Check error properties (must at least have "body")
  return "body" in value && typeof value.body === "string";
}

function isWsResponse(value: unknown): value is WsResponse {
  return !!value && !!(value as WsResponse).response;
}

// As returned by Besu
// https://github.com/hyperledger/besu/blob/169acc7ed262d55e268f7a022118d096d9d0eaba/ethereum/api/src/main/java/org/hyperledger/besu/ethereum/api/jsonrpc/JsonRpcHttpService.java#L613
const jsonRpcErrorCodeToHttpCode = (code: number): number => {
  if ([-32_700, -32_602, -32_600].includes(code)) return 400;
  return 200;
};

@Injectable()
export class BesuService implements OnModuleDestroy {
  private ethersProvider: ethers.providers.JsonRpcProvider | undefined;

  private readonly logger = new Logger(BesuService.name);

  private reconnectWebSocket = true;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.timeout = configService.get<number>("requestTimeout");
  }

  // Make it easier to override the config in tests
  getBesuRpcNode(): string {
    return this.configService.get<string>("besuRpcNode");
  }

  getEthersProvider() {
    if (!this.ethersProvider) {
      this.initBesuProvider();
    }
    return this.ethersProvider!;
  }

  initBesuProvider(): void {
    const besuRpcNode = this.getBesuRpcNode();

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

  async send(method: string, params: unknown[]): Promise<unknown> {
    return this.getEthersProvider().send(method, params);
  }

  async sendToBesu(query: BesuDto): Promise<BesuServiceResponse> {
    if (!this.ethersProvider) {
      this.initBesuProvider();
    }

    // Send request to Besu
    try {
      const res = await this.send(query.method, query.params);

      return {
        data: {
          // eslint-disable-next-line unicorn/no-null
          id: query.id ?? null,
          jsonrpc: query.jsonrpc,
          result: res,
        },
        status: 200,
      };
    } catch (error) {
      if (isWsResponse(error)) {
        try {
          const response = JSON.parse(error.response) as BesuResponseObject;
          return {
            data: {
              ...response,
              // eslint-disable-next-line unicorn/no-null
              id: query.id ?? null,
            },
            status: jsonRpcErrorCodeToHttpCode(error.code),
          };
        } catch (error_) {
          // Log whatever could be useful for debugging
          this.logger.log("An error occurred while parsing Besu's response");
          this.logger.log(error_);

          // Don't reveal details to the client
          throw new InternalServerError(InternalServerError.defaultTitle, {
            detail:
              "The server encountered an internal error and was unable to complete your request",
          });
        }
      }

      if (isJsonRpcResponseError(error)) {
        try {
          const response = JSON.parse(error.body) as BesuResponseObject;
          return {
            data: {
              ...response,
              // eslint-disable-next-line unicorn/no-null
              id: query.id ?? null,
            },
            status:
              error.status ??
              jsonRpcErrorCodeToHttpCode(
                Number.parseInt(response.error?.code ?? "-32600", 10),
              ),
          };
        } catch (error_) {
          // Log whatever could be useful for debugging
          this.logger.log("An error occurred while parsing Besu's response");
          this.logger.log(error_);

          // Don't reveal details to the client
          throw new InternalServerError(InternalServerError.defaultTitle, {
            detail:
              "The server encountered an internal error and was unable to complete your request",
          });
        }
      }

      // Log whatever could be useful for debugging
      this.logger.error("An error occurred while querying Besu");
      this.logger.error(error);

      // Don't reveal details to the client
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail:
          "The server encountered an internal error and was unable to complete your request",
      });
    }
  }
}

export default { BesuService };
