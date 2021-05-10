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
  AttributeObject,
  AdministratorResponseObject,
  AttributeDetailsObject,
} from "./administrators.interface";
import PaginationQuery from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/administrators")
export default class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getAdministrators(
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<DidLink>> {
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
  async getAdministrator(
    @Param() params: { did?: string }
  ): Promise<AdministratorResponseObject> {
    const { did } = params;

    return this.administratorsService.getAdministrator(did);
  }

  @Get("/:did/attributes")
  async getAdministratorAttributes(
    @Param() params: { did: string },
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<IdLink>> {
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
  async getAdministratorAttribute(
    @Param() params: { did: string; attributeId: string }
  ): Promise<AttributeDetailsObject> {
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
  async getAdministratorAttributeRevisions(
    @Param() params: { did: string; attributeId: string },
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<AttributeObject>> {
    const { did, attributeId } = params;

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
