import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { IssuersService } from "./issuers.service";
import {
  formatIssuers,
  formatAttributes,
  formatRevisions,
} from "./issuers.formatter";
import {
  IdLink,
  IssuerResponseObject,
  AttributeObject,
  AttributeDetailsObject,
  DidLink,
} from "./issuers.interface";
import PaginationQuery from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/issuers")
export class IssuersController {
  constructor(
    private issuersService: IssuersService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async issuers(
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<DidLink>> {
    const issuers = await this.issuersService.getIssuers(
      query["page[after]"],
      query["page[size]"]
    );
    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers`;

    return formatIssuers(
      issuers,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:did")
  async getIssuer(
    @Param() params: { did?: string }
  ): Promise<IssuerResponseObject> {
    const { did } = params;
    return this.issuersService.getIssuer(did);
  }

  @Get("/:did/attributes")
  async getIssuerAttributes(
    @Param() params: { did: string },
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<IdLink>> {
    const { did } = params;

    const attributes = await this.issuersService.getAttributes(did);

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/attributes`;

    return formatAttributes(
      attributes,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:did/attributes/:attributeId")
  async issuerAttributeId(
    @Param() params: { did: string; attributeId: string }
  ): Promise<AttributeDetailsObject> {
    const { did, attributeId } = params;

    if (!(await this.issuersService.didIncludesAttribute(did, attributeId))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const attribute = await this.issuersService.getAttribute(attributeId);

    return {
      did,
      attribute,
    };
  }

  @Get("/:did/attributes/:attributeId/revisions")
  async issuerAttributeIdRevisions(
    @Param() params: { did: string; attributeId: string },
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<AttributeObject>> {
    const { did, attributeId } = params;

    if (!(await this.issuersService.didIncludesAttribute(did, attributeId))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const {
      revisions,
      total,
    } = await this.issuersService.getIssuerAttributeIdRevisions(
      attributeId,
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/attributes/${attributeId}/revisions`;

    return formatRevisions(
      revisions,
      total,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }
}

export default IssuersController;
