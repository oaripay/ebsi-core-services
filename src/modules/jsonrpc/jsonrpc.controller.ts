import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { SiopJwtAuthGuard } from "../auth/guards";
import { Client, ClientInfo } from "../auth/decorators";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestDeleteAppAdministratorDto,
  RequestInsertAppDto,
  RequestInsertAppAdministratorDto,
  RequestInsertAppInfoDto,
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestUpdateAppDto,
  RequestInsertRevocationDto,
  RequestInsertAppPublicKeyDto,
  RequestUpdateAppPublicKeyDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestInsertAuthorizationDto,
  RequestUpdateAuthorizationDto,
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
  @UseGuards(SiopJwtAuthGuard)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto,
    @Client() client: ClientInfo
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "deleteAppAdministrator": {
        const transaction =
          await this.jsonRpcService.buildTransactionDeleteAppAdministrator(
            body as RequestDeleteAppAdministratorDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "insertApp": {
        const transaction = await this.jsonRpcService.buildTransactionInsertApp(
          body as RequestInsertAppDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "insertAppAdministrator": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertAppAdministrator(
            body as RequestInsertAppAdministratorDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "insertAppInfo": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertAppInfo(
            body as RequestInsertAppInfoDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
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
      case "updateApp": {
        const transaction = await this.jsonRpcService.buildTransactionUpdateApp(
          body as RequestUpdateAppDto,
          id
        );
        return jsonRpcResponse(transaction, id);
      }
      case "insertRevocation": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertRevocation(
            body as RequestInsertRevocationDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "insertAppPublicKey": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertAppPublicKey(
            body as RequestInsertAppPublicKeyDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updateAppPublicKey": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateAppPublicKey(
            body as RequestUpdateAppPublicKeyDto,
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
      case "insertAuthorization": {
        const transaction =
          await this.jsonRpcService.buildTransactionInsertAuthorization(
            body as RequestInsertAuthorizationDto,
            id
          );
        return jsonRpcResponse(transaction, id);
      }
      case "updateAuthorization": {
        const transaction =
          await this.jsonRpcService.buildTransactionUpdateAuthorization(
            body as RequestUpdateAuthorizationDto,
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
