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
import {
  InvalidRequestJsonRpcError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { PaginatedList } from "../../interfaces/index.js";
import IdentifiersService from "./identifiers.service.js";
import { formatEvents, formatIdentifiers } from "./identifiers.formatter.js";
import { DidLink, Event } from "./identifiers.interface.js";
import {
  GetIdentifierParamsDto,
  GetIdentifierQueryDto,
  GetIdentifiersDto,
} from "./dto/index.js";
import type { ApiConfig } from "../../config/configuration.js";
import jsonRpcSchema from "./validators/JsonRpcSchema.js";
import { JsonRpcResponseObject } from "../jsonrpc/jsonrpc.interface.js";

@Controller("/identifiers")
export default class IdentifiersController {
  constructor(
    private identifiersService: IdentifiersService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getIdentifiers(
    @Query() query: GetIdentifiersDto,
  ): Promise<PaginatedList<DidLink>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { identifiers, prevPageIdentifiers, nextPageIdentifiers } =
      await this.identifiersService.getIdentifiers(
        query["page[after]"],
        query["page[size]"],
        query.controller,
        query["verification-method-id"],
        query["verification-relationship"],
      );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers`;

    return formatIdentifiers(
      identifiers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      prevPageIdentifiers,
      nextPageIdentifiers,
      query.controller,
      query["verification-method-id"],
      query["verification-relationship"],
    );
  }

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

  @Get("/:did/events")
  async getDidDocumentEvents(
    @Param() params: GetIdentifierParamsDto,
    @Query() query: GetIdentifiersDto,
  ): Promise<PaginatedList<Event>> {
    const { did } = params;

    const { events, prevPageEvents, nextPageEvents } =
      await this.identifiersService.getDidDocumentEvents(
        did,
        query["page[after]"],
        query["page[size]"],
      );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers/${did}/events`;

    return formatEvents(
      events,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      prevPageEvents,
      nextPageEvents,
    );
  }

  @HttpCode(200)
  @Post("/:did/actions")
  async processAction(
    @Param() params: GetIdentifierParamsDto,
    @Body() unsafeBody: unknown,
  ): Promise<JsonRpcResponseObject> {
    if (!unsafeBody || typeof unsafeBody !== "object") {
      throw new InvalidRequestJsonRpcError(
        "JSON-RPC payload must be an object",
        null,
      );
    }

    const parsedBody = jsonRpcSchema.safeParse(unsafeBody);

    if (!parsedBody.success) {
      throw new InvalidRequestJsonRpcError(
        getErrorMessage(parsedBody.error),
        null,
      );
    }

    const body = parsedBody.data;

    const { did } = params;
    const { method, id: requestId } = body;
    const id = requestId ?? null;

    switch (method) {
      case "checkController": {
        const result = await this.identifiersService.checkController(
          did,
          body,
          id,
        );
        return { jsonrpc: "2.0", id, result };
      }

      default:
        throw new InvalidRequestJsonRpcError(
          `The method '${method}' is invalid`,
          id,
        );
    }
  }
}
