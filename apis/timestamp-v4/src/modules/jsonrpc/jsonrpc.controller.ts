import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import {
  Accepts,
  InvalidRequestJsonRpcError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { jsonRpcSchema } from "./validators/JsonRpcSchema.js";
import { BearerJwtAuthGuard } from "../auth/guards/index.js";
import { User, type UserInfo } from "../auth/decorators/index.js";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number | null | undefined,
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/jsonrpc")
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Accepts("application/json")
  @UseGuards(BearerJwtAuthGuard)
  @Post()
  async jsonRPC(
    @Body() unsafeBody: unknown,
    @User() user: UserInfo,
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
    const id = requestId ?? undefined;

    switch (method) {
      case "insertHashAlgorithm": {
        const result =
          await this.jsonRpcService.buildTransactionInsertHashAlgorithm(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "updateHashAlgorithm": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateHashAlgorithm(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampHashes(body, id);
        return formatJsonRpcResponse(result, id);
      }
      case "timestampRecordHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampRecordHashes(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampRecordVersionHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampRecordVersionHashes(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampVersionHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampVersionHashes(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "appendRecordVersionHashes": {
        const result =
          await this.jsonRpcService.buildTransactionAppendRecordVersionHashes(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "revokeRecordOwner": {
        const result =
          await this.jsonRpcService.buildTransactionRevokeRecordOwner(body, id);
        return formatJsonRpcResponse(result, id);
      }
      case "insertRecordOwner": {
        const result =
          await this.jsonRpcService.buildTransactionInsertRecordOwner(body, id);
        return formatJsonRpcResponse(result, id);
      }
      case "insertRecordVersionInfo": {
        const result =
          await this.jsonRpcService.buildTransactionInsertRecordVersionInfo(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "detachRecordVersionHash": {
        const result =
          await this.jsonRpcService.buildTransactionDetachRecordVersionHash(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          body,
          user,
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
