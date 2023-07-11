import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestAddIssuerProxyDto,
  RequestUpdateIssuerProxyDto,
  RequestSetAttributeMetadataDto,
  RequestSetAttributeDataDto,
} from "./dto";
import { BearerJwtAuthGuard } from "../auth/guards";
import { Subject, SubjectInfo } from "../auth/decorators";

function jsonRpcResponse(
  result: unknown,
  id: string | number | null
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id, result };
}

@UseGuards(BearerJwtAuthGuard)
@Controller("/jsonrpc")
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto,
    @Subject() subject: SubjectInfo
  ): Promise<JsonRpcResponseObject> {
    const { method, id: requestId } = body;
    const id = requestId ?? null;
    const { scp: scope, sub } = subject;

    switch (method) {
      case "setAttributeMetadata": {
        const transaction =
          await this.jsonRpcService.buildTransactionSetAttributeMetadata(
            body as RequestSetAttributeMetadataDto,
            id,
            scope
          );
        return jsonRpcResponse(transaction, id);
      }
      case "setAttributeData": {
        const transaction =
          await this.jsonRpcService.buildTransactionSetAttributeData(
            body as RequestSetAttributeDataDto,
            id,
            sub,
            scope
          );
        return jsonRpcResponse(transaction, id);
      }
      case "addIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddIssuerProxy(
            body as RequestAddIssuerProxyDto,
            id,
            scope
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updateIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateIssuerProxy(
            body as RequestUpdateIssuerProxyDto,
            id,
            scope
          );
        return jsonRpcResponse(transaction, id);
      }
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          sub,
          body as RequestSendSignedTransactionDto,
          id,
          scope
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
