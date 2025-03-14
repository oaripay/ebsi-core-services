import { Accepts, InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";

import type { SubjectInfo } from "../auth/decorators/index.ts";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.ts";

import { Subject } from "../auth/decorators/index.ts";
import { BearerJwtAuthGuard } from "../auth/guards/index.ts";
import {
  JsonRpcDto,
  RequestAddIssuerProxyDto,
  RequestInsertIssuerDto,
  RequestSendSignedTransactionDto,
  RequestSetAttributeDataDto,
  RequestSetAttributeMetadataDto,
  RequestUpdateIssuerDto,
  RequestUpdateIssuerProxyDto,
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
@UseGuards(BearerJwtAuthGuard)
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @Accepts("application/json")
  @HttpCode(200)
  @Post()
  async jsonRpc(
    @Body() body: JsonRpcDto,
    @Subject() subject: SubjectInfo,
  ): Promise<JsonRpcResponseObject> {
    const { id: requestId, method } = body;
    // "id": An identifier established by the Client that MUST contain a String, Number, or NULL value if included. If it is not included it is assumed to be a notification.
    // See https://www.jsonrpc.org/specification#request_object
    // eslint-disable-next-line unicorn/no-null
    const id = requestId ?? null;
    const { scp: scope, sub } = subject;

    switch (method) {
      case "addIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddIssuerProxy(
            body as RequestAddIssuerProxyDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "insertIssuer": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertIssuer(
            body as RequestInsertIssuerDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "sendSignedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          sub,
          body as RequestSendSignedTransactionDto,
          id,
          scope,
        );
        return formatJsonRpcResponse(result, id);
      }
      case "setAttributeData": {
        const transaction =
          await this.jsonRpcService.buildTransactionSetAttributeData(
            body as RequestSetAttributeDataDto,
            id,
            sub,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "setAttributeMetadata": {
        const transaction =
          await this.jsonRpcService.buildTransactionSetAttributeMetadata(
            body as RequestSetAttributeMetadataDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateIssuer": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateIssuer(
            body as RequestUpdateIssuerDto,
            id,
            scope,
          );
        return formatJsonRpcResponse(transaction, id);
      }
      case "updateIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateIssuerProxy(
            body as RequestUpdateIssuerProxyDto,
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
