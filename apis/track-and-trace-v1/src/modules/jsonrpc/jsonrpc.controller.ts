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

@Controller("/jsonrpc")
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @Post()
  @Accepts("application/json")
  @HttpCode(200)
  @UseGuards(BearerJwtAuthGuard)
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

    // TODO: if requestId is undefined, the request should be treated as a notification and return a 200 with an empty body
    // See: https://www.jsonrpc.org/specification#notification

    switch (method) {
      case "authoriseDid": {
        const transaction =
          await this.jsonRpcService.buildTransactionAuthoriseDid(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "createDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionCreateDocument(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "removeDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionRemoveDocument(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "grantAccess": {
        const transaction =
          await this.jsonRpcService.buildTransactionGrantAccess(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "revokeAccess": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeAccess(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "writeEvent": {
        const transaction =
          await this.jsonRpcService.buildTransactionWriteEvent(
            body,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          body,
          id,
          sub,
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
