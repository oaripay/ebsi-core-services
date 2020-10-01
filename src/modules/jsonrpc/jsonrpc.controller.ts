import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import JsonRpcService from "./jsonrpc.service";
import JsonRpcDto from "./dto/jsonrpc.dto";
import { InvalidRequestJsonRpcError } from "./errors";
import JsonRpcResponseObject from "./types/jsonrpc.interface";
import RequestInsertIssuerDto from "./dto/insertIssuer/request-insert-issuer.dto";
import RequestSignedTransaction from "./dto/signedTransaction/request-signed-transaction.dto";

function jsonRpcResponse(
  result: unknown,
  id: string | number
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/trusted-issuers-registry")
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post("/v2/jsonrpc")
  async jsonRPC(@Body() body: JsonRpcDto): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertIssuer": {
        const transaction = await this.jsonRpcService.buildTransactionInsertIssuer(
          body as RequestInsertIssuerDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "signedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          body as RequestSignedTransaction,
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
