import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { AdministratorsService } from "./administrators.service";
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
import { ApiConfig } from "../../config/configuration";
import { SiopJwtAuthGuard } from "../auth/guards";
import { Client, ClientInfo } from "../auth/decorators";
import {
  GetAdministratorAttributeParamsDto,
  GetAdministratorParamsDto,
} from "./dto";

@UseGuards(SiopJwtAuthGuard)
@Controller("/administrators")
export class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
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
  async getAdministrator(
    @Param() params: GetAdministratorParamsDto,
    @Client() client: ClientInfo
  ): Promise<AdministratorResponseObject> {
    const { did } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

    return this.administratorsService.getAdministrator(did);
  }

  @Get("/:did/attributes")
  async getAdministratorAttributes(
    @Param() params: GetAdministratorParamsDto,
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
  async getAdministratorAttribute(
    @Param() params: GetAdministratorAttributeParamsDto,
    @Client() client: ClientInfo
  ): Promise<AttributeDetailsObject> {
    const { did, attributeId } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

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
    @Param() params: GetAdministratorAttributeParamsDto,
    @Query() query: PaginationQuery,
    @Client() client: ClientInfo
  ): Promise<PaginatedList<AttributeObject>> {
    const { did, attributeId } = params;

    if (did !== client.did) {
      await this.administratorsService.allowAdministratorsOnly(client.did);
    }

    if (
      !(await this.administratorsService.didIncludesAttribute(did, attributeId))
    ) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const { revisions, total } =
      await this.administratorsService.getAdministratorAttributeRevisions(
        attributeId,
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

export default AdministratorsController;
