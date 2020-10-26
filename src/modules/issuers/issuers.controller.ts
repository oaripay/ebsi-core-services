import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import IssuersService from "./issuers.service";
import formatIssuers from "./issuers.formatter";
import {
  IssuersListResponseObject,
  IssuerResponseObject,
  AttributeObject,
  AttributeDetailsObject,
  AttributesListResponseObject,
} from "./types/issuers.interface";
import QueryPagination from "./types/query.interface";
import { pagination } from "../../shared/utils";
import { ConfigObject } from "../../config/configuration";

@Controller("/issuers")
export default class IssuersController {
  constructor(
    private issuersService: IssuersService,
    private configService: ConfigService<ConfigObject>
  ) {}

  @Get("")
  async issuers(
    @Query() query: QueryPagination
  ): Promise<IssuersListResponseObject> {
    const pageSize = query["page[size]"];
    const page = query["page[after]"];

    const issuers = await this.issuersService.getIssuers(page, pageSize);
    const { items, total, prev, next } = formatIssuers(issuers);

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");

    return {
      self: `${domain}${apiUrlPrefix}/issuers?page[after]=${page}&page[size]=${pageSize}`,
      items,
      total,
      pageSize,
      links: {
        first: `${apiUrlPrefix}/issuers?page[after]=0&page[size]=${pageSize}`,
        prev: `${apiUrlPrefix}/issuers?page[after]=${prev}&page[size]=${pageSize}`,
        next: `${apiUrlPrefix}/issuers?page[after]=${next}&page[size]=${pageSize}`,
        last: `${apiUrlPrefix}/issuers?page[after]=${parseInt(
          Number((total - 1) / pageSize).toString(),
          10
        )}&page[size]=${pageSize}`,
      },
    };
  }

  @Get("/:did")
  async issuer(
    @Param() params: { did?: string }
  ): Promise<IssuerResponseObject> {
    const { did } = params;
    return this.issuersService.getIssuer(did);
  }

  @Get("/:did/attributes")
  issuerAttributes(
    @Param() params: { did: string }
  ): Promise<AttributeObject[]> {
    const { did } = params;
    return this.issuersService.getAttributes(did);
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
    const attribute = await this.issuersService.getAttributeId(attributeId);
    return { did, attribute };
  }

  @Get("/:did/attributes/:attributeId/revisions")
  async issuerAttributeIdRevisions(
    @Query() query: QueryPagination,
    @Param() params: { did: string; attributeId: string }
  ): Promise<AttributesListResponseObject> {
    const pageSize = query["page[size]"];
    const page = query["page[after]"];

    const { did, attributeId } = params;
    if (!(await this.issuersService.didIncludesAttribute(did, attributeId))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const revisions = await this.issuersService.getIssuerAttributeIdRevisions(
      attributeId
    );

    const { items, total, prev, next, last } = pagination<AttributeObject>(
      revisions,
      page,
      pageSize
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const urlPath = `${apiUrlPrefix}/issuers/${did}/attributes/${attributeId}/revisions`;

    return {
      self: `${domain}${urlPath}?page[after]=${page}&page[size]=${pageSize}`,
      items,
      total,
      pageSize,
      links: {
        first: `${urlPath}?page[after]=0&page[size]=${pageSize}`,
        prev: `${urlPath}?page[after]=${prev}&page[size]=${pageSize}`,
        next: `${urlPath}?page[after]=${next}&page[size]=${pageSize}`,
        last: `${urlPath}?page[after]=${last}&page[size]=${pageSize}`,
      },
    };
  }
}
