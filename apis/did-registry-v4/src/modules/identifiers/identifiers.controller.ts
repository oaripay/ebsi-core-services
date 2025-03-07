import type { PaginatedList } from "@ebsiint-api/shared";
import type { FastifyReply } from "fastify";

import { Accepts, InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.ts";
import type { JsonRpcResponseObject } from "../jsonrpc/jsonrpc.interface.ts";
import type { DidLink } from "./identifiers.interface.ts";

import { JsonRpcDto } from "../jsonrpc/dto/index.ts";
import {
  GetIdentifierParamsDto,
  GetIdentifierQueryDto,
  GetIdentifiersDto,
} from "./dto/index.ts";
import { RequestCheckControllerDto } from "./dto/request-check-controller.dto.ts";
import { formatIdentifiers } from "./identifiers.formatter.ts";
import IdentifiersService from "./identifiers.service.ts";

@Controller("/identifiers")
export default class IdentifiersController {
  constructor(
    private identifiersService: IdentifiersService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/did+ld+json", "application/did+json")
  @Get("/:did")
  async getDidDocument(
    @Param() params: GetIdentifierParamsDto,
    @Query() query: GetIdentifierQueryDto,
    @Headers("Accept") accept: string,
    @Res() res: FastifyReply,
  ): Promise<Record<string, unknown>> {
    const { did } = params;

    const didDocument = await this.identifiersService.getDidDocument(
      did,
      query["valid-at"],
    );

    if (accept === "application/did+json") {
      const { "@context": context, ...otherProps } = didDocument;
      return res.type("application/did+json").send(otherProps);
    }

    return res.type("application/did+ld+json").send(didDocument);
  }

  @Accepts("application/json")
  @Get("")
  async getIdentifiers(
    @Query() query: GetIdentifiersDto,
  ): Promise<PaginatedList<DidLink>> {
    const identifiers = await this.identifiersService.getIdentifiers(
      query["page[after]"],
      query["page[size]"],
      query.controller,
      query["verification-method-id"],
      query["verification-relationship"],
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers`;

    return formatIdentifiers(
      identifiers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.controller,
      query["verification-method-id"],
      query["verification-relationship"],
    );
  }

  @Accepts("application/json")
  @HttpCode(200)
  @Post("/:did/actions")
  async processAction(
    @Param() params: GetIdentifierParamsDto,
    @Body() body: JsonRpcDto,
  ): Promise<JsonRpcResponseObject> {
    const { did } = params;
    const { id: requestId, method } = body;
    // "id": An identifier established by the Client that MUST contain a String, Number, or NULL value if included. If it is not included it is assumed to be a notification.
    // See https://www.jsonrpc.org/specification#request_object
    // eslint-disable-next-line unicorn/no-null
    const id = requestId ?? null;

    switch (method) {
      case "checkController": {
        const result = await this.identifiersService.checkController(
          did,
          body as RequestCheckControllerDto,
          id,
        );
        return { id, jsonrpc: "2.0", result };
      }

      default: {
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id,
        );
      }
    }
  }
}
