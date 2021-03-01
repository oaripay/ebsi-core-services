import { Controller, Body, Post, HttpCode } from "@nestjs/common";
import { JsonRpcService } from "./jsonrpc.service";
import { InvalidRequestJsonRpcError } from "./errors";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  JsonRpcDto,
  RequestSignedTransactionDto,
  RequestInsertLedgerInfoDto,
  RequestInsertSmartContractInfoDto,
  RequestUpdateSmartContractInfoByIdDto,
  RequestUpdateSmartContractInfoByNameDto,
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
      case "insertLedgerInfo": {
        const result = await this.jsonRpcService.buildTransactionInsertLedgerInfo(
          body as RequestInsertLedgerInfoDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "insertSmartContractInfo": {
        const result = await this.jsonRpcService.buildTransactionInsertSmartContractInfo(
          body as RequestInsertSmartContractInfoDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updateSmartContractInfoById": {
        const result = await this.jsonRpcService.buildTransactionUpdateSmartContractInfoById(
          body as RequestUpdateSmartContractInfoByIdDto,
          id
        );
        return jsonRpcResponse(result, id);
      }
      case "updateSmartContractInfoByName": {
        const result = await this.jsonRpcService.buildTransactionUpdateSmartContractInfoByName(
          body as RequestUpdateSmartContractInfoByNameDto,
          id
        );
        return jsonRpcResponse(result, id);
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
