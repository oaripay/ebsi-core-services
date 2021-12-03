import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestSendSignedTransactionDto,
  RequestInsertLedgerInfoDto,
  RequestUpdateLedgerInfoByIdDto,
  RequestUpdateLedgerInfoByNameDto,
  RequestUpdateLedgerNameDto,
  RequestInsertSmartContractInfoDto,
  RequestUpdateSmartContractInfoByIdDto,
  RequestUpdateSmartContractInfoByNameDto,
  RequestUpdateSmartContractNameDto,
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
      case "insertLedgerInfo": {
        const result =
          await this.jsonRpcService.buildTransactionInsertLedgerInfo(
            body as RequestInsertLedgerInfoDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateLedgerInfoById": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateLedgerInfoById(
            body as RequestUpdateLedgerInfoByIdDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateLedgerInfoByName": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateLedgerInfoByName(
            body as RequestUpdateLedgerInfoByNameDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateLedgerName": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateLedgerName(
            body as RequestUpdateLedgerNameDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "insertSmartContractInfo": {
        const result =
          await this.jsonRpcService.buildTransactionInsertSmartContractInfo(
            body as RequestInsertSmartContractInfoDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateSmartContractInfoById": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateSmartContractInfoById(
            body as RequestUpdateSmartContractInfoByIdDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateSmartContractInfoByName": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateSmartContractInfoByName(
            body as RequestUpdateSmartContractInfoByNameDto,
            id
          );
        return jsonRpcResponse(result, id);
      }
      case "updateSmartContractName": {
        const result =
          await this.jsonRpcService.buildTransactionUpdateSmartContractName(
            body as RequestUpdateSmartContractNameDto,
            id
          );
        return jsonRpcResponse(result, id);
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
