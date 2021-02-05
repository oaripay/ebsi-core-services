import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestSignedTransactionDto,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestTimestampHashesDto,
  RequestTimestampRecordHashesDto,
  RequestTimestampRecordVersionHashesDto,
  RequestDetachRecordVersionHashDto,
  RequestInsertRecordOwnerDto,
  RequestInsertRecordVersionInfoDto,
} from "./dto";

function jsonRpcResponse(
  result: unknown,
  id: string | number
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/jsonrpc")
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post()
  async jsonRPC(@Body() body: JsonRpcDto): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertHashAlgorithm": {
        const result = await this.jsonRpcService.buildTransactionInsertHashAlgorithm(
          body as RequestInsertHashAlgorithmDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updateHashAlgorithm": {
        const result = await this.jsonRpcService.buildTransactionUpdateHashAlgorithm(
          body as RequestUpdateHashAlgorithmDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "timestampHashes": {
        const result = await this.jsonRpcService.buildTransactionTimestampHashes(
          body as RequestTimestampHashesDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "timestampRecordHashes": {
        const result = await this.jsonRpcService.buildTransactionTimestampRecordHashes(
          body as RequestTimestampRecordHashesDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "timestampRecordVersionHashes": {
        const result = await this.jsonRpcService.buildTransactionTimestampRecordVersionHashes(
          body as RequestTimestampRecordVersionHashesDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "insertRecordOwner": {
        const result = await this.jsonRpcService.buildTransactionInsertRecordOwner(
          body as RequestInsertRecordOwnerDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "insertRecordVersionInfo": {
        const result = await this.jsonRpcService.buildTransactionInsertRecordVersionInfo(
          body as RequestInsertRecordVersionInfoDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "detachRecordVersionHash": {
        const result = await this.jsonRpcService.buildTransactionDetachRecordVersionHash(
          body as RequestDetachRecordVersionHashDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "signedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          body as RequestSignedTransactionDto,
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
