import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import {
  InvalidRequestJsonRpcError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { SiopJwtAuthGuard } from "../auth/guards/index.js";
import { Client, type ClientInfo } from "../auth/decorators/index.js";
import { jsonRpcSchema } from "./validators/JsonRpcSchema.js";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number | null | undefined,
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@UseGuards(SiopJwtAuthGuard)
@Controller("/jsonrpc")
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post()
  async jsonRPC(
    @Body() unsafeBody: unknown,
    @Client() client: ClientInfo,
  ): Promise<JsonRpcResponseObject> {
    if (!unsafeBody || typeof unsafeBody !== "object") {
      throw new InvalidRequestJsonRpcError(
        "JSON-RPC payload must be an object",
        null,
      );
    }

    const parsedBody = jsonRpcSchema.safeParse(unsafeBody);

    if (!parsedBody.success) {
      throw new InvalidRequestJsonRpcError(
        getErrorMessage(parsedBody.error),
        null,
      );
    }

    const body = parsedBody.data;
    const { method, id: requestId } = body;
    const id = requestId ?? null;

    switch (method) {
      case "insertSchema": {
        const result = await this.jsonRpcService.buildTransactionInsertSchema(
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updateSchema": {
        const result = await this.jsonRpcService.buildTransactionUpdateSchema(
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updateMetadata": {
        const result = await this.jsonRpcService.buildTransactionUpdateMetadata(
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "sendSignedTransaction":
      case "signedTransaction": {
        // Note: "signedTransaction" is deprecated and will be replaced by "sendSignedTransaction" in the next major version
        const result = await this.jsonRpcService.sendTransaction(
          client.did,
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      default:
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id,
        );
    }
  }
}

export default JsonRpcController;
