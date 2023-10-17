import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertPolicyDto,
  RequestInsertSchemaDto,
  RequestUpdatePolicyDto,
  RequestUpdateSchemaDto,
  RequestUpdateMetadataDto,
} from "./dto/index.js";
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
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto,
    @Client() client: ClientInfo,
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertPolicy": {
        const result = await this.jsonRpcService.buildTransactionInsertPolicy(
          body as RequestInsertPolicyDto,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "insertSchema": {
        const result = await this.jsonRpcService.buildTransactionInsertSchema(
          body as RequestInsertSchemaDto,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updatePolicy": {
        const result = await this.jsonRpcService.buildTransactionUpdatePolicy(
          body as RequestUpdatePolicyDto,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updateSchema": {
        const result = await this.jsonRpcService.buildTransactionUpdateSchema(
          body as RequestUpdateSchemaDto,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updateMetadata": {
        const result = await this.jsonRpcService.buildTransactionUpdateMetadata(
          body as RequestUpdateMetadataDto,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "sendSignedTransaction":
      case "signedTransaction": {
        // Note: "signedTransaction" is deprecated and will be replaced by "sendSignedTransaction" in the next major version
        const result = await this.jsonRpcService.sendTransaction(
          client.did,
          body as RequestSendSignedTransactionDto,
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
