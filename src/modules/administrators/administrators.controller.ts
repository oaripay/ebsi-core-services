// EBSIINT-2939 temporary revert
// import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AdministratorsService from "./administrators.service";
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
// EBSIINT-2939 temporary revert
// import { SiopJwtAuthGuard } from "../auth/guards/siop-jwt-auth.guard";
// import { Client, ClientInfo } from "../auth/decorators";

@Controller("/administrators")
export default class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  // EBSIINT-2939 temporary revert
  // @UseGuards(SiopJwtAuthGuard)
  async getAdministrators(
    @Query() query: PaginationQuery
    // EBSIINT-2939 temporary revert
    // @Client() client: ClientInfo
  ): Promise<PaginatedList<DidLink>> {
    // EBSIINT-2939 temporary revert
    // await this.administratorsService.allowAdministratorsOnly(client.did);

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
  // EBSIINT-2939 temporary revert
  // @UseGuards(SiopJwtAuthGuard)
  async getAdministrator(
    @Param() params: { did?: string }
    // EBSIINT-2939 temporary revert
    // @Client() client: ClientInfo
  ): Promise<AdministratorResponseObject> {
    const { did } = params;

    // EBSIINT-2939 temporary revert
    // if (did !== client.did) {
    //   await this.administratorsService.allowAdministratorsOnly(client.did);
    // }

    return this.administratorsService.getAdministrator(did);
  }

  @Get("/:did/attributes")
  // EBSIINT-2939 temporary revert
  // @UseGuards(SiopJwtAuthGuard)
  async getAdministratorAttributes(
    @Param() params: { did: string },
    @Query() query: PaginationQuery
    // EBSIINT-2939 temporary revert
    // @Client() client: ClientInfo
  ): Promise<PaginatedList<IdLink>> {
    // EBSIINT-2939 temporary revert
    // await this.administratorsService.allowAdministratorsOnly(client.did);

    const { did } = params;

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
  // EBSIINT-2939 temporary revert
  // @UseGuards(SiopJwtAuthGuard)
  async getAdministratorAttribute(
    @Param() params: { did: string; attributeId: string }
    // EBSIINT-2939 temporary revert
    // @Client() client: ClientInfo
  ): Promise<AttributeDetailsObject> {
    // EBSIINT-2939 temporary revert
    // await this.administratorsService.allowAdministratorsOnly(client.did);

    const { did, attributeId } = params;

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
  // EBSIINT-2939 temporary revert
  // @UseGuards(SiopJwtAuthGuard)
  async getAdministratorAttributeRevisions(
    @Param() params: { did: string; attributeId: string },
    @Query() query: PaginationQuery
    // EBSIINT-2939 temporary revert
    // @Client() client: ClientInfo
  ): Promise<PaginatedList<AttributeObject>> {
    // EBSIINT-2939 temporary revert
    // await this.administratorsService.allowAdministratorsOnly(client.did);

    const { did, attributeId } = params;

    const {
      revisions,
      total,
    } = await this.administratorsService.getAdministratorAttributeRevisions(
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
