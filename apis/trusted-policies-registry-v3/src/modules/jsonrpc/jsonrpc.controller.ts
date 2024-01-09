import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import {
  InvalidRequestJsonRpcError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { jsonRpcSchema } from "./validators/index.js";
import { SiopJwtAuthGuard } from "../auth/guards/index.js";
import { Client, type ClientInfo } from "../auth/decorators/index.js";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number | null | undefined,
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@UseGuards(SiopJwtAuthGuard)
@Controller("/jsonrpc")
export default class AppController {
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
