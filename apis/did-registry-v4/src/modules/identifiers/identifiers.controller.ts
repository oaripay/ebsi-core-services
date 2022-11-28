import {
  Controller,
  Get,
  Query,
  Param,
  Headers,
  Res,
  Post,
  Body,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply } from "fastify";
import { PaginatedList } from "@ebsiint-api/shared";
import IdentifiersService from "./identifiers.service";
import { formatIdentifiers } from "./identifiers.formatter";
import { DidLink } from "./identifiers.interface";
import {
  GetIdentifierParamsDto,
  GetIdentifierQueryDto,
  GetIdentifiersDto,
} from "./dto";
import { ApiConfig } from "../../config/configuration";
import { JsonRpcResponseObject } from "../jsonrpc/jsonrpc.interface";
import { InvalidRequestJsonRpcError } from "../jsonrpc/errors";
import { JsonRpcDto } from "../jsonrpc/dto";
import { RequestCheckControllerDto } from "./dto/request-check-controller.dto";

@Controller("/identifiers")
export default class IdentifiersController {
  constructor(
    private identifiersService: IdentifiersService,
    private configService: ConfigService<ApiConfig, true>
  ) {}

  @Get("")
  async getIdentifiers(
    @Query() query: GetIdentifiersDto
  ): Promise<PaginatedList<DidLink>> {
    const identifiers = await this.identifiersService.getIdentifiers(
      query["page[after]"],
      query["page[size]"],
      query.controller,
      query["verification-method-id"],
      query["verification-relationship"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers`;

    return formatIdentifiers(
      identifiers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.controller,
      query["verification-method-id"],
      query["verification-relationship"]
    );
  }

  @Get("/:did")
  async getDidDocument(
    @Param() params: GetIdentifierParamsDto,
    @Query() query: GetIdentifierQueryDto,
    @Headers("Accept") accept: string,
    @Res() res: FastifyReply
  ): Promise<{ [x: string]: unknown }> {
    const { did } = params;

    const didDocument = await this.identifiersService.getDidDocument(
      did,
      query["valid-at"]
    );

    if (accept === "application/did+json") {
      const { "@context": context, ...otherProps } = didDocument;
      return res.type("application/did+json").send(otherProps);
    }

    return res.type("application/did+ld+json").send(didDocument);
  }

  @HttpCode(200)
  @Post("/:did/actions")
  async processAction(
    @Param() params: GetIdentifierParamsDto,
    @Body() body: JsonRpcDto
  ): Promise<JsonRpcResponseObject> {
    const { did } = params;

    const { method, id } = body;
    switch (method) {
      case "checkController": {
        const result = await this.identifiersService.checkController(
          did,
          body as RequestCheckControllerDto,
          id
        );
        return { jsonrpc: "2.0", id: id ?? null, result };
      }

      default:
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id
        );
    }
  }
}
