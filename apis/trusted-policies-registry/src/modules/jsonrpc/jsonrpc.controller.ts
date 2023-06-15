import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestAddPolicyConditionsDto,
  RequestDeletePolicyConditionDto,
  RequestActivatePolicyDto,
  RequestDeactivatePolicyDto,
  RequestInsertUserAttributesDto,
  RequestUpdateUserAttributeDto,
  RequestDeleteUserAttributeDto,
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
export default class AppController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @Post()
  async jsonRPC(
    @Body() body: JsonRpcDto,
    @Client() client: ClientInfo
  ): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "insertPolicy": {
        const result = await this.jsonRpcService.buildTransactionInsertPolicy(
          body as RequestInsertPolicyDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updatePolicy": {
        const result = await this.jsonRpcService.buildTransactionUpdatePolicy(
          body as RequestUpdatePolicyDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "addPolicyConditions": {
        const result =
          await this.jsonRpcService.buildTransactionAddPolicyConditions(
            body as RequestAddPolicyConditionsDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "deletePolicyCondition": {
        const result =
          await this.jsonRpcService.buildTransactionDeletePolicyCondition(
            body as RequestDeletePolicyConditionDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "activatePolicy": {
        const result = await this.jsonRpcService.buildTransactionActivatePolicy(
          body as RequestActivatePolicyDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "deactivatePolicy": {
        const result =
          await this.jsonRpcService.buildTransactionDeactivatePolicy(
            body as RequestDeactivatePolicyDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "insertUserAttributes": {
        const result =
          await this.jsonRpcService.buildTransactionInsertUserAttributes(
            body as RequestInsertUserAttributesDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateUserAttribute": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateUserAttribute(
            body as RequestUpdateUserAttributeDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "deleteUserAttribute": {
        const result =
          await this.jsonRpcService.buildTransactionDeleteUserAttribute(
            body as RequestDeleteUserAttributeDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "sendSignedTransaction": {
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
