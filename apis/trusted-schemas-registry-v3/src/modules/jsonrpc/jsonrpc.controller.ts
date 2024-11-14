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
import { Subject, type SubjectInfo } from "../auth/decorators/index.js";
import { TSR_WRITE_SCOPE } from "../auth/auth.constants.js";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number | null,
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function assertScopeContains(
  scope: string,
  validScopes: string | string[],
  methodName: string,
  id: number | string | null | undefined,
) {
  const expectedScopes = Array.isArray(validScopes)
    ? validScopes
    : [validScopes];

  if (!expectedScopes.some((scp) => scope.includes(scp))) {
    throw new InvalidRequestJsonRpcError(
      `'${methodName}' requires an access token with the scope '${expectedScopes.join(
        "' or '",
      )}'`,
      id,
    );
  }
}

@Controller("/jsonrpc")
export class JsonRpcController {
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

    assertScopeContains(scope, [TSR_WRITE_SCOPE], "method", id);

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
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(sub, body, id);
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
