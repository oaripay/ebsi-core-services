import { Controller, Get, Query, Param, Req, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import type { FastifyRequest } from "fastify";
import { PaginatedList, PaginationQuery } from "@ebsiint-api/shared";
import { IssuersService } from "./issuers.service";
import {
  formatIssuers,
  formatAttributes,
  formatRevisions,
  formatProxies,
} from "./issuers.formatter";
import {
  IdLink,
  IssuerResponseObject,
  AttributeObject,
  AttributeDetailsObject,
  DidLink,
  IssuerProxyResponseObject,
  ProxyLink,
} from "./issuers.interface";
import { ApiConfig } from "../../config/configuration";
import {
  GetIssuerAttributeParamsDto,
  GetIssuerParamsDto,
  GetIssuerProxyParamsDto,
} from "./dto";

@Controller("/issuers")
export class IssuersController {
  constructor(
    private issuersService: IssuersService,
    private configService: ConfigService<ApiConfig, true>
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
    @Param() params: GetIssuerParamsDto
  ): Promise<IssuerResponseObject> {
    const { did } = params;
    return this.issuersService.getIssuer(did);
  }

  @Get("/:did/attributes")
  async getIssuerAttributes(
    @Param() params: GetIssuerParamsDto,
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
    @Param() params: GetIssuerAttributeParamsDto
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
    @Param() params: GetIssuerAttributeParamsDto,
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<AttributeObject>> {
    const { did, attributeId } = params;

    if (!(await this.issuersService.didIncludesAttribute(did, attributeId))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const { revisions, total } =
      await this.issuersService.getIssuerAttributeIdRevisions(
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

  @Get("/:did/proxies")
  async getIssuerProxies(
    @Param() params: GetIssuerParamsDto
  ): Promise<PaginatedList<ProxyLink>> {
    const { did } = params;

    const proxies = await this.issuersService.getIssuerProxies(did);

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/proxies`;

    return formatProxies(proxies, baseUrl);
  }

  @Get("/:did/proxies/:proxyId")
  async getIssuerProxy(
    @Param() params: GetIssuerProxyParamsDto
  ): Promise<IssuerProxyResponseObject> {
    const { did, proxyId } = params;

    return this.issuersService.getIssuerProxy(did, proxyId);
  }

  @Get("/:did/proxies/:proxyId/*")
  @Header("content-type", "text/plain; charset=utf-8")
  async proxyRequest(
    @Param() params: GetIssuerProxyParamsDto,
    @Req() req: FastifyRequest
  ): Promise<string> {
    const { did, proxyId } = params;
    const { url } = req;

    // Forward request to issuer's proxy
    return this.issuersService.proxyRequest(did, proxyId, url);
  }
}

export default IssuersController;
