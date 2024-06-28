import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import {
  InvalidRequestJsonRpcError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { jsonRpcSchema } from "./validators/index.js";
import { BearerJwtAuthGuard } from "../auth/guards/index.js";
import { Subject, type SubjectInfo } from "../auth/decorators/index.js";
import { TPR_WRITE_SCOPE } from "../auth/auth.constants.js";

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
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @UseGuards(BearerJwtAuthGuard)
  @Post()
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

    assertScopeContains(scope, [TPR_WRITE_SCOPE], "method", id);

    // TODO: if requestId is undefined, the request should be treated as a notification and return a 200 with an empty body
    // See: https://www.jsonrpc.org/specification#notification

    switch (method) {
      case "insertPolicy": {
        const result = await this.jsonRpcService.buildTransactionInsertPolicy(
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updatePolicy": {
        const result = await this.jsonRpcService.buildTransactionUpdatePolicy(
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "activatePolicy": {
        const result = await this.jsonRpcService.buildTransactionActivatePolicy(
          body,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "deactivatePolicy": {
        const result =
          await this.jsonRpcService.buildTransactionDeactivatePolicy(body, id);
        return formatJsonRpcResponse(result, id);
      }
      case "insertUserAttributes": {
        const result =
          await this.jsonRpcService.buildTransactionInsertUserAttributes(
            body,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "deleteUserAttribute": {
        const result =
          await this.jsonRpcService.buildTransactionDeleteUserAttribute(
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
