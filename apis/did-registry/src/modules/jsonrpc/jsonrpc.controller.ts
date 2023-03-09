import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import { OAuth2OrSiopJwtAuthGuard } from "../auth/guards";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestInsertDidControllerDto,
  RequestInsertDidDocumentDto,
  RequestUpdateDidDocumentDto,
  RequestUpdateDidControllerDto,
  RequestRevokeDidControllerDto,
  RequestAppendDidDocumentVersionHashDto,
  RequestDetachDidDocumentVersionHashDto,
  RequestAppendDidDocumentVersionMetadataDto,
  RequestDetachDidDocumentVersionMetadataDto,
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
      case "insertHashAlgorithm": {
        const result =
          await this.jsonRpcService.buildTransactionInsertHashAlgorithm(
            body as RequestInsertHashAlgorithmDto,
            id
          );
        return formatJsonRpcResponse(result, id);
      }
      case "updateHashAlgorithm": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateHashAlgorithm(
            body as RequestUpdateHashAlgorithmDto,
            id
          );
        return formatJsonRpcResponse(result, id);
      }
      case "insertDidDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertDidDocument(
            subject.sub,
            body as RequestInsertDidDocumentDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateDidDocument": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateDidDocument(
            subject.sub,
            body as RequestUpdateDidDocumentDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "insertDidController": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertDidController(
            subject.sub,
            body as RequestInsertDidControllerDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateDidController": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateDidController(
            subject.sub,
            body as RequestUpdateDidControllerDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "revokeDidController": {
        const transaction =
          await this.jsonRpcService.buildTransactionRevokeDidController(
            subject.sub,
            body as RequestRevokeDidControllerDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "appendDidDocumentVersionHash": {
        const transaction =
          await this.jsonRpcService.buildTransactionAppendDidDocumentVersionHash(
            subject.sub,
            body as RequestAppendDidDocumentVersionHashDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "detachDidDocumentVersionHash": {
        const transaction =
          await this.jsonRpcService.buildTransactionDetachDidDocumentVersionHash(
            subject.sub,
            body as RequestDetachDidDocumentVersionHashDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "appendDidDocumentVersionMetadata": {
        const transaction =
          await this.jsonRpcService.buildTransactionAppendDidDocumentVersionMetadata(
            subject.sub,
            body as RequestAppendDidDocumentVersionMetadataDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "detachDidDocumentVersionMetadata": {
        const transaction =
          await this.jsonRpcService.buildTransactionDetachDidDocumentVersionMetadata(
            subject.sub,
            body as RequestDetachDidDocumentVersionMetadataDto,
            id
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "sendSignedTransaction":
      case "signedTransaction": {
        // Note: "signedTransaction" is deprecated and will be replaced by "sendSignedTransaction" in the next major version
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
