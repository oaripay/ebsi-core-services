import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import {
  Accepts,
  InvalidRequestJsonRpcError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { BearerJwtAuthGuard } from "../auth/guards/index.js";
import { Subject, type SubjectInfo } from "../auth/decorators/index.js";
import { jsonRpcSchema } from "./validators/JsonRpcSchema.js";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number | null | undefined,
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@UseGuards(BearerJwtAuthGuard)
@Controller("/jsonrpc")
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @Post()
  @Accepts("application/json")
  @HttpCode(200)
  async jsonRPC(
    @Body() unsafeBody: unknown,
    @Subject() subject: SubjectInfo,
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
    const { scp: scope, sub } = subject;

    switch (method) {
      case "setAttributeMetadata": {
        const transaction =
          await this.jsonRpcService.buildTransactionSetAttributeMetadata(
            body,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "setAttributeData": {
        const transaction =
          await this.jsonRpcService.buildTransactionSetAttributeData(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "addIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddIssuerProxy(
            body,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateIssuerProxy(
            body,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "removeIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionRemoveIssuerProxy(
            body,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          sub,
          body,
          id,
          scope,
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
