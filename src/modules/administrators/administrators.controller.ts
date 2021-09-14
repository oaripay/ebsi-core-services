import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdministratorsService } from "./administrators.service";
import {
  formatAdministrators,
  formatAttributes,
  formatRevisions,
} from "./administrators.formatter";
import {
  IdLink,
  DidLink,
  AdministratorResponseObject,
  AttributeDetailsObject,
  AttributeObject,
} from "./administrators.interface";
import { PaginationQuery } from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";
import { SiopJwtAuthGuard } from "../auth/guards/siop-jwt-auth.guard";
import { Client, ClientInfo } from "../auth/decorators";

@Controller("/administrators")
export default class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  @UseGuards(SiopJwtAuthGuard)
  async getAdministrators(
    @Query() query: PaginationQuery,
    @Client() client: ClientInfo
  ): Promise<PaginatedList<DidLink>> {
    await this.administratorsService.allowAdministratorsOnly(client.did);

    const administrators = await this.administratorsService.getAdministrators(
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/administrators`;

    return formatAdministrators(
      administrators,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:did")
  @UseGuards(SiopJwtAuthGuard)
  async getAdministrator(
    @Param() params: { did?: string },
    @Client() client: ClientInfo
  ): Promise<AdministratorResponseObject> {
    const { did } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

    return this.administratorsService.getAdministrator(did);
  }

  @Get("/:did/attributes")
  @UseGuards(SiopJwtAuthGuard)
  async getAdministratorAttributes(
    @Param() params: { did: string },
    @Query() query: PaginationQuery,
    @Client() client: ClientInfo
  ): Promise<PaginatedList<IdLink>> {
    const { did } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

    const attributes = await this.administratorsService.getAttributes(did);

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/administrators/${did}/attributes`;

    return formatAttributes(
      attributes,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:did/attributes/:attributeId")
  @UseGuards(SiopJwtAuthGuard)
  async getAdministratorAttribute(
    @Param() params: { did: string; attributeId: string },
    @Client() client: ClientInfo
  ): Promise<AttributeDetailsObject> {
    const { did, attributeId } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

    const attribute = await this.administratorsService.getAttribute(
      attributeId,
      did
    );

    return {
      did,
      attribute,
    };
  }

  @Get("/:did/attributes/:attributeId/revisions")
  @UseGuards(SiopJwtAuthGuard)
  async getAdministratorAttributeRevisions(
    @Param() params: { did: string; attributeId: string },
    @Query() query: PaginationQuery,
    @Client() client: ClientInfo
  ): Promise<PaginatedList<AttributeObject>> {
    const { did, attributeId } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

    const { revisions, total } =
      await this.administratorsService.getAdministratorAttributeRevisions(
        attributeId,
        did,
        query["page[after]"],
        query["page[size]"]
      );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/administrators/${did}/attributes/${attributeId}/revisions`;

    return formatRevisions(
      revisions,
      total,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }
}
