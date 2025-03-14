import { Accepts, InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";

import type { SubjectInfo } from "../auth/decorators/index.ts";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.ts";

import { Subject } from "../auth/decorators/index.ts";
import { BearerJwtAuthGuard } from "../auth/guards/index.ts";
import {
  JsonRpcDto,
  RequestAddControllerDto,
  RequestAddVerificationMethodDto,
  RequestAddVerificationRelationshipDto,
  RequestExpireVerificationMethodDto,
  RequestInsertDidDocumentDto,
  RequestRevokeControllerDto,
  RequestRevokeVerificationMethodDto,
  RequestRollVerificationMethodDto,
  RequestSendSignedTransactionDto,
  RequestUpdateBaseDocumentDto,
} from "./dto/index.ts";
import { JsonRpcService } from "./jsonrpc.service.ts";

function formatJsonRpcResponse(
  result: unknown,
  id: null | number | string | undefined,
) {
  return {
    // eslint-disable-next-line unicorn/no-null
    id: id ?? null,
    jsonrpc: "2.0",
    result,
  } satisfies JsonRpcResponseObject;
}

@Controller("/jsonrpc")
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @Accepts("application/json")
  @HttpCode(200)
  @Post()
  @UseGuards(BearerJwtAuthGuard)
  async jsonRpc(
    @Body() body: JsonRpcDto,
    @Subject() subject: SubjectInfo,
  ): Promise<JsonRpcResponseObject> {
    const { id: requestId, method } = body;
    const id = requestId ?? undefined;
    const { scp: scope, sub } = subject;

    switch (method) {
      case "addController": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddController(
            body as RequestAddControllerDto,
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
      case "expireVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionExpireVerificationMethod(
            body as RequestExpireVerificationMethodDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
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
      case "revokeController": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeController(
            body as RequestRevokeControllerDto,
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
      case "updateBaseDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateBaseDocument(
            body as RequestUpdateBaseDocumentDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      default: {
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id,
        );
      }
    }
  }
}
