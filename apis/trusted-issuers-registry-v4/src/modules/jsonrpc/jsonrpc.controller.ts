import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSendSignedTransactionDto,
  RequestAddIssuerProxyDto,
  RequestUpdateIssuerProxyDto,
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
      case "insertIssuer": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertIssuer(
            body as RequestInsertIssuerDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updateIssuer": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateIssuer(
            body as RequestUpdateIssuerDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "insertPolicy": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertPolicy(
            body as RequestInsertPolicyDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updatePolicy": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdatePolicy(
            body as RequestUpdatePolicyDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "addIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionAddIssuerProxy(
            body as RequestAddIssuerProxyDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updateIssuerProxy": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateIssuerProxy(
            body as RequestUpdateIssuerProxyDto,
            id
          );
        return jsonRpcResponse(transaction, id);
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
