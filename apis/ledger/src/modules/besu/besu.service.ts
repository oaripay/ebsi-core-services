import { URL } from "node:url";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type WebSocket from "ws";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from "@cef-ebsi/problem-details-errors";
import { BesuResponseObject, BesuServiceResponse } from "./besu.interface";
import { ApiConfig } from "../../config/configuration";
import { isDeployingSmartContract } from "./besu.utils";
import { BesuDto } from "./dto";

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

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

function hasOwnProperty<X, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop) as boolean;
}

function isJsonRpcResponseError(value: unknown): value is JsonRpcResponseError {
  if (!(value instanceof Error) || !value || typeof value !== "object") {
    return false;
  }

  // Check error properties (must at least have "body")
  return hasOwnProperty(value, "body") && typeof value.body === "string";
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

  private ethersProvider: ethers.providers.JsonRpcProvider;

  private reconnectWebSocket = true;

  private chainId: number;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig>) {
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
          EXPECTED_PONG_BACK
        );
      }, KEEP_ALIVE_CHECK_INTERVAL);
    });

    websocket.on("close", (err: unknown) => {
      this.logger.warn(
        `The ws connection was closed: ${JSON.stringify(err, null, 2)}`
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

  async getChainId(): Promise<number> {
    if (!this.chainId) {
      try {
        this.chainId = (await this.ethersProvider.getNetwork()).chainId;
      } catch (error) {
        throw new Error(
          `Error getting EBSI chainId: ${(error as Error).message}`
        );
      }
    }

    return this.chainId;
  }

  // Make it easier to override the config in tests
  getBesuRpcNode(): string {
    return this.configService.get<string>("besuRpcNode");
  }

  async send(method: string, params: unknown[]): Promise<unknown> {
    return this.ethersProvider.send(method, params);
  }

  async sendToBesu(query: BesuDto): Promise<BesuServiceResponse> {
    let isDeployingSC = false;

    if (!this.ethersProvider) {
      this.initBesuProvider();
    }

    try {
      const chainId = await this.getChainId();
      isDeployingSC = isDeployingSmartContract(query, chainId);
    } catch (error) {
      if ((error as Error).message.includes("Error getting EBSI chainId")) {
        throw error;
      }

      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Error parsing the transaction: ${(error as Error).message}`,
      });
    }

    if (isDeployingSC) {
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: "Deployment of new smart contracts is not allowed",
      });
    }

    // Send request to Besu
    try {
      const res = await this.send(query.method, query.params);

      return {
        status: 200,
        data: {
          jsonrpc: query.jsonrpc,
          id: query.id,
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
              id: query.id,
            },
          };
        } catch (err) {
          // Log whatever could be useful for debugging
          this.logger.log("An error occured while parsing Besu's reponse");
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
              jsonRpcErrorCodeToHttpCode(parseInt(response.error.code, 10)),
            data: {
              ...response,
              id: query.id,
            },
          };
        } catch (err) {
          // Log whatever could be useful for debugging
          this.logger.log("An error occured while parsing Besu's reponse");
          this.logger.log(err);

          // Don't reveal details to the client
          throw new InternalServerError(InternalServerError.defaultTitle, {
            detail:
              "The server encountered an internal error and was unable to complete your request",
          });
        }
      }

      // Log whatever could be useful for debugging
      this.logger.error("An error occured while querying Besu");
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
