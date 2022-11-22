import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import { OAuth2OrSiopJwtAuthGuard } from "../auth/guards";
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
} from "./dto";
import { Subject, SubjectInfo } from "../auth/decorators";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/jsonrpc")
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @UseGuards(OAuth2OrSiopJwtAuthGuard)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto,
    @Subject() subject: SubjectInfo
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertDidDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertDidDocument(
            subject.sub,
            body as RequestInsertDidDocumentDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "updateBaseDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateBaseDocument(
            subject.sub,
            body as RequestUpdateBaseDocumentDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "addController": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddController(
            subject.sub,
            body as RequestAddControllerDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "revokeController": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeController(
            subject.sub,
            body as RequestRevokeControllerDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "addVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddVerificationMethod(
            subject.sub,
            body as RequestAddVerificationMethodDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "addVerificationRelationship": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddVerificationRelationship(
            subject.sub,
            body as RequestAddVerificationRelationshipDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "revokeVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeVerificationMethod(
            subject.sub,
            body as RequestRevokeVerificationMethodDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "expireVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionExpireVerificationMethod(
            subject.sub,
            body as RequestExpireVerificationMethodDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "rollVerificationMethod": {
        const transaction =
          await this.jsonRpcService.buildTransactionRollVerificationMethod(
            subject.sub,
            body as RequestRollVerificationMethodDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }

      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          subject.sub,
          body as RequestSendSignedTransactionDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }

      default:
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id
        );
    }
  }
}
