import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import AdministratorsService from "./administrators.service";
import {
  formatAdministrators,
  formatAttributes,
  formatRevisions,
} from "./administrators.formatter";
import {
  IdLink,
  AdministratorResponseObject,
  AttributeObject,
  AttributeDetailsObject,
  DidLink,
} from "./administrators.interface";
import PaginationQuery from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ConfigObject } from "../../config/configuration";

@Controller("/administrators")
export default class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ConfigObject>
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

    if (
      !(await this.administratorsService.didIncludesAttribute(did, attributeId))
    ) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const attribute = await this.administratorsService.getAttribute(
      attributeId
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

    if (
      !(await this.administratorsService.didIncludesAttribute(did, attributeId))
    ) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const revisions = await this.administratorsService.getAdministratorAttributeRevisions(
      attributeId,
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/administrators/${did}/attributes/${attributeId}/revisions`;

    return formatRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }
}
