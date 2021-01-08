import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestInsertAppDto,
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestUpdateAppPublicKeyDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSignedTransactionDto,
} from "./dto";

function jsonRpcResponse(
  result: unknown,
  id: string | number
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/jsonrpc")
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post()
  async jsonRPC(@Body() body: JsonRpcDto): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertApp": {
        const transaction = await this.jsonRpcService.buildTransactionInsertApp(
          body as RequestInsertAppDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "insertAdministrator": {
        const transaction = await this.jsonRpcService.buildTransactionInsertAdministrator(
          body as RequestInsertAdministratorDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "updateAdministrator": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateAdministrator(
          body as RequestUpdateAdministratorDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "updateAppPublicKey": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateAppPublicKey(
          body as RequestUpdateAppPublicKeyDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "insertPolicy": {
        const transaction = await this.jsonRpcService.buildTransactionInsertPolicy(
          body as RequestInsertPolicyDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "updatePolicy": {
        const transaction = await this.jsonRpcService.buildTransactionUpdatePolicy(
          body as RequestUpdatePolicyDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "signedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          body as RequestSignedTransactionDto,
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
