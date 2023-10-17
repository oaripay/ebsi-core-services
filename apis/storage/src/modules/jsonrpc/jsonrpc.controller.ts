import { Controller, Body, Post, HttpCode, UseGuards } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { JsonRpcDto, RequestCassandraCallDto } from "./dto/index.js";
import { OAuth2JwtAuthGuard } from "../auth/guards/index.js";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number | null | undefined,
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/stores/distributed/jsonrpc")
export class JsonRpcController {
  constructor(private jsonRpcService: JsonRpcService) {}

  @HttpCode(200)
  @UseGuards(OAuth2JwtAuthGuard)
  @Post()
  async jsonRPC(@Body() body: JsonRpcDto): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "cassandra_call": {
        const result = await this.jsonRpcService.cassandraCall(
          body as RequestCassandraCallDto,
          id,
        );
        return formatJsonRpcResponse(result, id);
      }
      default:
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id,
        );
    }
  }
}

export default JsonRpcController;
