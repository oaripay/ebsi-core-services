import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestTimestampHashesDto,
  RequestTimestampRecordHashesDto,
  RequestTimestampRecordVersionHashesDto,
  RequestAppendRecordVersionHashesDto,
  RequestDetachRecordVersionHashDto,
  RequestInsertRecordOwnerDto,
  RequestRevokeRecordOwnerDto,
  RequestInsertRecordVersionInfoDto,
  RequestTimestampVersionHashesDto,
} from "./dto/index.js";
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
  @UseGuards(BearerJwtAuthGuard)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto,
    @User() user: UserInfo,
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertHashAlgorithm": {
        const result =
          await this.jsonRpcService.buildTransactionInsertHashAlgorithm(
            body as RequestInsertHashAlgorithmDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "updateHashAlgorithm": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateHashAlgorithm(
            body as RequestUpdateHashAlgorithmDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampHashes(
            body as RequestTimestampHashesDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampRecordHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampRecordHashes(
            body as RequestTimestampRecordHashesDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampRecordVersionHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampRecordVersionHashes(
            body as RequestTimestampRecordVersionHashesDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "timestampVersionHashes": {
        const result =
          await this.jsonRpcService.buildTransactionTimestampVersionHashes(
            body as RequestTimestampVersionHashesDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "appendRecordVersionHashes": {
        const result =
          await this.jsonRpcService.buildTransactionAppendRecordVersionHashes(
            body as RequestAppendRecordVersionHashesDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "revokeRecordOwner": {
        const result =
          await this.jsonRpcService.buildTransactionRevokeRecordOwner(
            body as RequestRevokeRecordOwnerDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "insertRecordOwner": {
        const result =
          await this.jsonRpcService.buildTransactionInsertRecordOwner(
            body as RequestInsertRecordOwnerDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "insertRecordVersionInfo": {
        const result =
          await this.jsonRpcService.buildTransactionInsertRecordVersionInfo(
            body as RequestInsertRecordVersionInfoDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "detachRecordVersionHash": {
        const result =
          await this.jsonRpcService.buildTransactionDetachRecordVersionHash(
            body as RequestDetachRecordVersionHashDto,
            id,
          );
        return formatJsonRpcResponse(result, id);
      }
      case "sendSignedTransaction":
      case "signedTransaction": {
        // Note: "signedTransaction" is deprecated and will be replaced by "sendSignedTransaction" in the next major version
        const result = await this.jsonRpcService.sendTransaction(
          body as RequestSendSignedTransactionDto,
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
