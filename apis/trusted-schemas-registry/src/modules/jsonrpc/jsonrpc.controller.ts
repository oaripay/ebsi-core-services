import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertPolicyDto,
  RequestInsertSchemaDto,
  RequestUpdatePolicyDto,
  RequestUpdateSchemaDto,
  RequestUpdateMetadataDto,
} from "./dto";
import { SiopJwtAuthGuard } from "../auth/guards";
import { Client, ClientInfo } from "../auth/decorators";

function jsonRpcResponse(
  result: unknown,
  id: string | number
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
    @Client() client: ClientInfo
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertPolicy": {
        const result = await this.jsonRpcService.buildTransactionInsertPolicy(
          body as RequestInsertPolicyDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "insertSchema": {
        const result = await this.jsonRpcService.buildTransactionInsertSchema(
          body as RequestInsertSchemaDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updatePolicy": {
        const result = await this.jsonRpcService.buildTransactionUpdatePolicy(
          body as RequestUpdatePolicyDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updateSchema": {
        const result = await this.jsonRpcService.buildTransactionUpdateSchema(
          body as RequestUpdateSchemaDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updateMetadata": {
        const result = await this.jsonRpcService.buildTransactionUpdateMetadata(
          body as RequestUpdateMetadataDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "sendSignedTransaction":
      case "signedTransaction": {
        // Note: "signedTransaction" is deprecated and will be replaced by "sendSignedTransaction" in the next major version
        const result = await this.jsonRpcService.sendTransaction(
          client.did,
          body as RequestSendSignedTransactionDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      default:
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id
        );
    }
  }
}

export default JsonRpcController;
