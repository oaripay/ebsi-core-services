// EBSIINT-2939 temporary revert
// import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
// EBSIINT-2939 temporary revert
// import { OAuth2OrSiopJwtAuthGuard } from "../auth/guards";
import {
  JsonRpcDto,
  RequestSignedTransactionDto,
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestInsertDidControllerDto,
  RequestInsertDidDocumentDto,
  RequestUpdateDidDocumentDto,
  RequestUpdateDidControllerDto,
  RequestRevokeDidControllerDto,
  RequestInsertDidMethodDto,
  RequestUpdateDidMethodDto,
  RequestAppendDidDocumentVersionHashDto,
  RequestDetachDidDocumentVersionHashDto,
  RequestAppendDidDocumentVersionMetadataDto,
  RequestDetachDidDocumentVersionMetadataDto,
} from "./dto";
// EBSIINT-2939 temporary revert
// import { Subject, SubjectInfo } from "../auth/decorators";

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
  // EBSIINT-2939 temporary revert
  // @UseGuards(OAuth2OrSiopJwtAuthGuard)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto
    // EBSIINT-2939 temporary revert
    // @Subject() subject: SubjectInfo
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertAdministrator": {
        const result = await this.jsonRpcService.buildTransactionInsertAdministrator(
          body as RequestInsertAdministratorDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updateAdministrator": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateAdministrator(
          body as RequestUpdateAdministratorDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "insertPolicy": {
        const transaction = await this.jsonRpcService.buildTransactionInsertPolicy(
          body as RequestInsertPolicyDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updatePolicy": {
        const transaction = await this.jsonRpcService.buildTransactionUpdatePolicy(
          body as RequestUpdatePolicyDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "insertHashAlgorithm": {
        const result = await this.jsonRpcService.buildTransactionInsertHashAlgorithm(
          body as RequestInsertHashAlgorithmDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }
      case "updateHashAlgorithm": {
        const result = await this.jsonRpcService.buildTransactionUpdateHashAlgorithm(
          body as RequestUpdateHashAlgorithmDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }
      case "insertDidDocument": {
        const transaction = await this.jsonRpcService.buildTransactionInsertDidDocument(
          body as RequestInsertDidDocumentDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateDidDocument": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateDidDocument(
          body as RequestUpdateDidDocumentDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "insertDidController": {
        const transaction = await this.jsonRpcService.buildTransactionInsertDidController(
          body as RequestInsertDidControllerDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateDidController": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateDidController(
          body as RequestUpdateDidControllerDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "revokeDidController": {
        const transaction = await this.jsonRpcService.buildTransactionRevokeDidController(
          body as RequestRevokeDidControllerDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "insertDidMethod": {
        const transaction = await this.jsonRpcService.buildTransactionInsertDidMethod(
          body as RequestInsertDidMethodDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateDidMethod": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateDidMethod(
          body as RequestUpdateDidMethodDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "appendDidDocumentVersionHash": {
        const transaction = await this.jsonRpcService.buildTransactionAppendDidMethodVersionHash(
          body as RequestAppendDidDocumentVersionHashDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "detachDidDocumentVersionHash": {
        const transaction = await this.jsonRpcService.buildTransactionDetachDidMethodVersionHash(
          body as RequestDetachDidDocumentVersionHashDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "appendDidDocumentVersionMetadata": {
        const transaction = await this.jsonRpcService.buildTransactionAppendDidMethodVersionMetadata(
          body as RequestAppendDidDocumentVersionMetadataDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "detachDidDocumentVersionMetadata": {
        const transaction = await this.jsonRpcService.buildTransactionDetachDidMethodVersionMetadata(
          body as RequestDetachDidDocumentVersionMetadataDto,
          id
        );
        return formatJsonRpcResponse(transaction, id);
      }
      case "signedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          // EBSIINT-2939 temporary revert
          // subject.sub,
          "did:ebsi:remove-me",
          body as RequestSignedTransactionDto,
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
