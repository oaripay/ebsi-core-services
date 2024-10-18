import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { Accepts, InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { BearerJwtAuthGuard } from "../auth/guards/index.js";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertDidDocumentDto,
  RequestUpdateBaseDocumentDto,
  RequestAddControllerDto,
  RequestRevokeControllerDto,
  RequestAddVerificationMethodDto,
  RequestAddVerificationRelationshipDto,
  RequestRevokeVerificationMethodDto,
  RequestExpireVerificationMethodDto,
  RequestRollVerificationMethodDto,
} from "./dto/index.js";
import { Subject, type SubjectInfo } from "../auth/decorators/index.js";

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
    @Body() body: JsonRpcDto,
    @Subject() subject: SubjectInfo,
  ): Promise<JsonRpcResponseObject> {
    const { method, id: requestId } = body;
    const id = requestId ?? undefined;
    const { scp: scope, sub } = subject;

    switch (method) {
      case "insertDidDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertDidDocument(
            body as RequestInsertDidDocumentDto,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateBaseDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateBaseDocument(
            body as RequestUpdateBaseDocumentDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "addController": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddController(
            body as RequestAddControllerDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "revokeController": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeController(
            body as RequestRevokeControllerDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "addVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddVerificationMethod(
            body as RequestAddVerificationMethodDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "addVerificationRelationship": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddVerificationRelationship(
            body as RequestAddVerificationRelationshipDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "revokeVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeVerificationMethod(
            body as RequestRevokeVerificationMethodDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "expireVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionExpireVerificationMethod(
            body as RequestExpireVerificationMethodDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "rollVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionRollVerificationMethod(
            body as RequestRollVerificationMethodDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          body as RequestSendSignedTransactionDto,
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
