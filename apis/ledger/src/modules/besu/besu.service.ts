import {
  BesuService as AbstractBesuService,
  InternalServerError,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  BesuResponseObject,
  BesuServiceResponse,
} from "./besu.interface.js";
import type { BesuDto } from "./dto/index.js";

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
export class BesuService extends AbstractBesuService {
  constructor(configService: ConfigService<ApiConfig, true>) {
    const logger = new Logger(BesuService.name);

    const url = configService.get("besuRpcNode", { infer: true });
    const requestTimeout = configService.get("requestTimeout", { infer: true });

    super(url, requestTimeout, logger);
  }

  async sendToBesu(query: BesuDto): Promise<BesuServiceResponse> {
    const provider = this.getProvider();

    // Send request to Besu
    try {
      const res = (await provider.send(query.method, query.params)) as unknown;

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
