import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import JsonRpcService from "./jsonrpc.service";
import JsonRpcDto from "./dto/jsonrpc.dto";
import { InvalidRequestJsonRpcError } from "./errors";
import JsonRpcResponseObject from "./types/jsonrpc.interface";
import RequestInsertAdministratorDto from "./dto/insertAdministrator/request-insert-administrator.dto";
import RequestUpdateAdministratorDto from "./dto/updateAdministrator/request-update-administrator.dto";
import RequestInsertIssuerDto from "./dto/insertIssuer/request-insert-issuer.dto";
import RequestUpdateIssuerDto from "./dto/updateIssuer/request-update-issuer.dto";
import RequestInsertPolicyDto from "./dto/insertPolicy/request-insert-policy.dto";
import RequestSignedTransaction from "./dto/signedTransaction/request-signed-transaction.dto";

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
      case "insertIssuer": {
        const transaction = await this.jsonRpcService.buildTransactionInsertIssuer(
          body as RequestInsertIssuerDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "updateIssuer": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateIssuer(
          body as RequestUpdateIssuerDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "insertPolicy":
      case "updatePolicy": {
        const transaction = await this.jsonRpcService.buildTransactionPolicy(
          method,
          body as RequestInsertPolicyDto,
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
