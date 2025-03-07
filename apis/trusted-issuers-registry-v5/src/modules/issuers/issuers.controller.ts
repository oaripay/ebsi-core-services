import type { PaginatedList } from "@ebsiint-api/shared";
import type { FastifyRequest } from "fastify";

import { Accepts, NotFoundError, PaginationQuery } from "@ebsiint-api/shared";
import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.ts";
import type {
  AttributeDetailsObject,
  AttributeObject,
  DidLink,
  IdLink,
  IssuerProxyResponseObject,
  IssuerResponseObject,
  ProxyLink,
} from "./issuers.interface.ts";

import {
  GetIssuerAttributeParamsDto,
  GetIssuerParamsDto,
  GetIssuerProxyParamsDto,
} from "./dto/index.ts";
import {
  formatAttributes,
  formatIssuers,
  formatProxies,
  formatRevisions,
} from "./issuers.formatter.ts";
import { IssuersService } from "./issuers.service.ts";

const validationPipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true,
});

@Controller("/issuers")
export class IssuersController {
  constructor(
    private issuersService: IssuersService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("/:did")
  @UsePipes(validationPipe)
  async getIssuer(
    @Param() params: GetIssuerParamsDto,
  ): Promise<IssuerResponseObject> {
    const { did } = params;
    return this.issuersService.getIssuer(did);
  }

  @Accepts("application/json")
  @Get("/:did/attributes")
  @UsePipes(validationPipe)
  async getIssuerAttributes(
    @Param() params: GetIssuerParamsDto,
    @Query() query: PaginationQuery,
  ): Promise<PaginatedList<IdLink>> {
    const { did } = params;

    const attributes = await this.issuersService.getAttributes(did);

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/attributes`;

    return formatAttributes(
      attributes,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Accepts("application/json")
  @Get("/:did/proxies")
  @UsePipes(validationPipe)
  async getIssuerProxies(
    @Param() params: GetIssuerParamsDto,
  ): Promise<PaginatedList<ProxyLink>> {
    const { did } = params;

    const proxies = await this.issuersService.getIssuerProxies(did);

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/proxies`;

    return formatProxies(proxies, baseUrl);
  }

  @Accepts("application/json")
  @Get("/:did/proxies/:proxyId")
  @UsePipes(validationPipe)
  async getIssuerProxy(
    @Param() params: GetIssuerProxyParamsDto,
  ): Promise<IssuerProxyResponseObject> {
    const { did, proxyId } = params;

    return this.issuersService.getIssuerProxy(did, proxyId);
  }

  @Accepts("application/json")
  @Get("/:did/attributes/:attributeId")
  @UsePipes(validationPipe)
  async issuerAttributeId(
    @Param() params: GetIssuerAttributeParamsDto,
  ): Promise<AttributeDetailsObject> {
    const { attributeId, did } = params;

    if (!(await this.issuersService.didIncludesAttribute(did, attributeId))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const attribute = await this.issuersService.getAttribute(attributeId);

    return {
      attribute,
      did,
    };
  }

  @Accepts("application/json")
  @Get("/:did/attributes/:attributeId/revisions")
  @UsePipes(validationPipe)
  async issuerAttributeIdRevisions(
    @Param() params: GetIssuerAttributeParamsDto,
    @Query() query: PaginationQuery,
  ): Promise<PaginatedList<AttributeObject>> {
    const { attributeId, did } = params;

    if (!(await this.issuersService.didIncludesAttribute(did, attributeId))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const { revisions, total } =
      await this.issuersService.getIssuerAttributeIdRevisions(
        attributeId,
        query["page[after]"],
        query["page[size]"],
      );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/attributes/${attributeId}/revisions`;

    return formatRevisions(
      revisions,
      total,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Accepts("application/json")
  @Get("")
  @UsePipes(validationPipe)
  async issuers(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedList<DidLink>> {
    const issuers = await this.issuersService.getIssuers(
      query["page[after]"],
      query["page[size]"],
    );
    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers`;

    return formatIssuers(
      issuers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Accepts("text/plain")
  @Get("/:did/proxies/:proxyId/*")
  // it does not use the restrictive validation pipe because
  // it accepts all routes (*)
  @Header("content-type", "text/plain; charset=utf-8")
  async proxyRequest(
    @Param() params: GetIssuerProxyParamsDto,
    @Req() req: FastifyRequest,
  ): Promise<string> {
    const { did, proxyId } = params;
    const { url } = req;

    // Forward request to issuer's proxy
    return this.issuersService.proxyRequest(did, proxyId, url);
  }
}

export default IssuersController;
