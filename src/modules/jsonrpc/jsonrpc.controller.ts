import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSignedTransactionDto,
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
      case "insertAdministrator": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertAdministrator(
            body as RequestInsertAdministratorDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updateAdministrator": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateAdministrator(
            body as RequestUpdateAdministratorDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
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
      case "signedTransaction": {
        const result = await this.jsonRpcService.sendTransaction(
          client.did,
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

export default JsonRpcController;
