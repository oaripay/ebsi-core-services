import { URL } from "node:url";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type WebSocket from "ws";
import { InternalServerError } from "@ebsiint-api/shared";
import { BesuResponseObject, BesuServiceResponse } from "./besu.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { BesuDto } from "./dto/index.js";

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

const PUBLIC_BESU_METHODS = new Set([
  "net_version",
  "eth_chainId",
  "eth_blockNumber",
  "eth_getTransactionCount",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getUncleByBlockHashAndIndex",
  "eth_getUncleByBlockNumberAndIndex",
  "eth_getUncleCountByBlockHash",
  "eth_getUncleCountByBlockNumber",
  "eth_getCode",
  "eth_call",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionReceipt",
  "eth_getLogs",
  // Not allowed:
  // "eth_sendRawTransaction",
  // "eth_estimateGas",
]);

interface WsResponse {
  code: number;
  response: string;
}

interface JsonRpcResponseError extends Error {
  reason: string;
  code: string;
  status: number;
  headers: Record<string, unknown>;
  body: string;
  requestBody: string;
  requestMethod: string;
  url: string;
}

function isWsResponse(value: unknown): value is WsResponse {
  return !!value && !!(value as WsResponse).response;
}

function isJsonRpcResponseError(value: unknown): value is JsonRpcResponseError {
  if (!(value instanceof Error) || !value || typeof value !== "object") {
    return false;
  }

  // Check error properties (must at least have "body")
  return "body" in value && typeof value.body === "string";
}

// As returned by Besu
// https://github.com/hyperledger/besu/blob/169acc7ed262d55e268f7a022118d096d9d0eaba/ethereum/api/src/main/java/org/hyperledger/besu/ethereum/api/jsonrpc/JsonRpcHttpService.java#L613
const jsonRpcErrorCodeToHttpCode = (code: number): number => {
  if ([-32600, -32602, -32700].includes(code)) return 400;
  return 200;
};

@Injectable()
export class BesuService implements OnModuleDestroy {
  private readonly logger = new Logger(BesuService.name);

  private ethersProvider: ethers.providers.JsonRpcProvider | undefined;

  private reconnectWebSocket = true;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.timeout = configService.get<number>("requestTimeout");
  }

  initBesuProvider(): void {
    const besuRpcNode = this.getBesuRpcNode();

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
        `The ws connection was closed: ${JSON.stringify(err, null, 2)}`,
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

  getEthersProvider() {
    if (!this.ethersProvider) {
      this.initBesuProvider();
    }
    return this.ethersProvider!;
  }

  // Make it easier to override the config in tests
  getBesuRpcNode(): string {
    return this.configService.get<string>("besuRpcNode");
  }

  async send(method: string, params: unknown[]): Promise<unknown> {
    return this.getEthersProvider().send(method, params);
  }

  async sendToBesu(query: BesuDto): Promise<BesuServiceResponse> {
    if (!PUBLIC_BESU_METHODS.has(query.method)) {
      // https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md#errors
      // -32601 - Method not found - The method does not exist / is not available.
      return {
        status: 200, // Besu also returns 200 when the error code is -32601
        data: {
          jsonrpc: query.jsonrpc,
          id: query.id ?? null,
          error: {
            code: -32601,
            message: `The method ${query.method} does not exist / is not available.`,
            data: null,
          },
        },
      };
    }

    if (!this.ethersProvider) {
      this.initBesuProvider();
    }

    // Send request to Besu
    try {
      const res = await this.send(query.method, query.params);

      return {
        status: 200,
        data: {
          jsonrpc: query.jsonrpc,
          id: query.id ?? null,
          result: res,
        },
      };
    } catch (e) {
      if (isWsResponse(e)) {
        try {
          const response = JSON.parse(e.response) as BesuResponseObject;
          return {
            status: jsonRpcErrorCodeToHttpCode(e.code),
            data: {
              ...response,
              id: query.id ?? null,
            },
          };
        } catch (err) {
          // Log whatever could be useful for debugging
          this.logger.log("An error occurred while parsing Besu's response");
          this.logger.log(err);

          // Don't reveal details to the client
          throw new InternalServerError(InternalServerError.defaultTitle, {
            detail:
              "The server encountered an internal error and was unable to complete your request",
          });
        }
      }

      if (isJsonRpcResponseError(e)) {
        try {
          const response = JSON.parse(e.body) as BesuResponseObject;
          return {
            status:
              e.status ??
              jsonRpcErrorCodeToHttpCode(response.error?.code ?? -32600),
            data: {
              ...response,
              id: query.id ?? null,
            },
          };
        } catch (err) {
          // Log whatever could be useful for debugging
          this.logger.log("An error occurred while parsing Besu's response");
          this.logger.log(err);

          // Don't reveal details to the client
          throw new InternalServerError(InternalServerError.defaultTitle, {
            detail:
              "The server encountered an internal error and was unable to complete your request",
          });
        }
      }

      // Log whatever could be useful for debugging
      this.logger.error("An error occurred while querying Besu");
      this.logger.error(e);

      // Don't reveal details to the client
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail:
          "The server encountered an internal error and was unable to complete your request",
      });
    }
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
}

export default { BesuService };
