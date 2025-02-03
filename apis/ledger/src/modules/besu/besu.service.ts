/* eslint-disable unicorn/no-null */
import type { JsonRpcPayload } from "ethers";

import {
  BesuService as AbstractBesuService,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  BesuJsonRpcError,
  BesuResponse,
  BesuServiceResponse,
} from "./besu.interface.js";
import type { BesuJsonRpcRequestPayload } from "./validators/besu-json-rpc-request-payload.js";

import { besuJsonRpcRequestPayload } from "./validators/besu-json-rpc-request-payload.js";

class JsonRpcError extends Error {
  private code: number;

  private id: null | number | string;

  constructor(
    message: string,
    code: number,
    id: null | number | string,
    options?: ErrorOptions,
  ) {
    super(message, { ...(!!options?.cause && { cause: options.cause }) });
    this.name = "JsonRpcError";
    this.code = code;
    this.id = id ?? null;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
      id: this.id,
      jsonrpc: "2.0",
    } satisfies BesuJsonRpcError;
  }
}

const PUBLIC_BESU_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getUncleByBlockHashAndIndex",
  "eth_getUncleByBlockNumberAndIndex",
  "eth_getUncleCountByBlockHash",
  "eth_getUncleCountByBlockNumber",
  "net_version",
  // Not allowed:
  // "eth_sendRawTransaction",
  // "eth_estimateGas",
]);

@Injectable()
export class BesuService extends AbstractBesuService {
  constructor(configService: ConfigService<ApiConfig, true>) {
    const logger = new Logger(BesuService.name);

    const url = configService.get("besuRpcNode", { infer: true });
    const requestTimeout = configService.get("requestTimeout", { infer: true });

    super(url, requestTimeout, logger);
  }

  async sendToBesu(rawBody: Buffer | undefined): Promise<BesuServiceResponse> {
    if (!rawBody) {
      const error = new JsonRpcError("Parse error", -32_700, null);

      this.logger.error(error);

      return {
        data: error.toJSON(),
        status: 400,
      };
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody.toString());
    } catch (parseError) {
      const error = new JsonRpcError("Parse error", -32_700, null, {
        cause: parseError,
      });

      this.logger.error(error);

      return {
        data: error.toJSON(),
        status: 400,
      };
    }

    // Batch requests
    if (Array.isArray(body)) {
      // The default number of allowed requests in a RPC batch request is 1024
      // https://besu.hyperledger.org/public-networks/how-to/use-besu-api/json-rpc
      if (body.length > 1024) {
        // EXCEEDS_RPC_MAX_BATCH_SIZE
        // https://github.com/hyperledger/besu/blob/4b8d93587eeb22f8cfd9c63f2210336f5e296211/ethereum/api/src/main/java/org/hyperledger/besu/ethereum/api/jsonrpc/internal/response/RpcErrorType.java#L156C31-L156C36
        const error = new JsonRpcError(
          "Number of requests exceeds max batch size",
          -32_005,
          null,
        );

        this.logger.error(error);

        return {
          data: error.toJSON(),
          status: 200,
        };
      }

      return {
        data: await this.handleBatchRequest(body),
        status: 200,
      };
    }

    // Single request
    return {
      data: await this.handleSingleRequest(body),
      status: 200,
    };
  }

  private async handleBatchRequest(
    requests: unknown[],
  ): Promise<BesuResponse[]> {
    const responses: BesuResponse[] = [];

    // Process requests sequentially because ethers.js' SocketProvider doesn't support batches
    for (const request of requests) {
      responses.push(await this.handleSingleRequest(request));
    }

    return responses.filter(Boolean);
  }

  private async handleSingleRequest(request: unknown): Promise<BesuResponse> {
    const payload = this.validatePayload(request);

    // Ignore notifications
    if (!payload) {
      return undefined;
    }

    if (payload instanceof JsonRpcError) {
      return payload.toJSON();
    }

    return this.processRequest(payload);
  }

  private async processRequest(
    payload: BesuJsonRpcRequestPayload,
  ): Promise<BesuResponse> {
    const provider = this.getProvider();

    // Send payload to Besu
    let response;
    try {
      response = await provider._send(payload as JsonRpcPayload);
    } catch (requestError) {
      const error = new JsonRpcError("Internal error", -32_603, payload.id, {
        cause: requestError,
      });

      this.logger.error("An error occurred while querying Besu");
      this.logger.error(error);

      return error.toJSON();
    }

    if (!Array.isArray(response) || response.length !== 1 || !response[0]) {
      this.logger.error("Unsupported response from Besu");
      this.logger.error(response);

      const error = new JsonRpcError("Internal error", -32_603, payload.id);

      return error.toJSON();
    }

    return {
      jsonrpc: "2.0",
      ...response[0],
    };
  }

  private validatePayload(
    payload: unknown,
  ): BesuJsonRpcRequestPayload | JsonRpcError | undefined {
    if (!payload || typeof payload !== "object") {
      // https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md#errors
      // -32600 - Invalid Request - The JSON sent is not a valid Request object.
      return new JsonRpcError("Invalid Request", -32_600, null);
    }

    if (!("id" in payload)) {
      // // Notifications aren't handled
      // See https://github.com/hyperledger/besu/blob/169acc7ed262d55e268f7a022118d096d9d0eaba/ethereum/api/src/main/java/org/hyperledger/besu/ethereum/api/jsonrpc/JsonRpcHttpService.java#L705C9-L705C40
      return undefined;
    }

    const parsedBody = besuJsonRpcRequestPayload.safeParse(payload);

    if (!parsedBody.success) {
      // https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md#errors
      // -32600 - Invalid Request - The JSON sent is not a valid Request object.
      return new JsonRpcError(
        getErrorMessage(parsedBody.error, "Invalid Request"),
        -32_600,
        typeof payload.id === "string" || typeof payload.id === "number"
          ? payload.id
          : null,
      );
    }

    const query = parsedBody.data;

    if (!PUBLIC_BESU_METHODS.has(query.method)) {
      // https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md#errors
      // -32601 - Method not found - The method does not exist / is not available.
      return new JsonRpcError(
        `The method ${query.method} does not exist / is not available.`,
        -32_601,
        query.id,
      );
    }

    return query;
  }
}

export default { BesuService };
