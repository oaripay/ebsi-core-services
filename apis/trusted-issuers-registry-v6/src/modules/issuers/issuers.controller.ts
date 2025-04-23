import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import type { FastifyRequest } from "fastify";

import { Accepts, PaginationQuery } from "@ebsiint-api/shared";
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

import type {
  Attribute_filter,
  Issuer_filter,
} from "../../../.graphclient/index.js";
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
  GetIssuerAttributesQueryDto,
  GetIssuerParamsDto,
  GetIssuerProxyParamsDto,
  GetIssuersQueryDto,
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
  private readonly issuersService: IssuersService;
  private readonly configService: ConfigService<ApiConfig, true>;

  constructor(
    issuersService: IssuersService,
    configService: ConfigService<ApiConfig, true>,
  ) {
    this.issuersService = issuersService;
    this.configService = configService;
  }

  @Accepts("application/json")
  @Get("")
  @UsePipes(validationPipe)
  async issuers(
    @Query() query: GetIssuersQueryDto,
  ): Promise<PaginatedListWithoutTotal<DidLink>> {
    const where: Issuer_filter = {
      ...(query["attribute-id"] && {
        attributes_: {
          id: query["attribute-id"],
        },
      }),
      ...(query["proxy-id"] && {
        proxies_: {
          id: query["proxy-id"],
        },
      }),
    };

    const issuers = await this.issuersService.getIssuers(
      query["page[after]"],
      query["page[size]"],
      where,
    );
    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetIssuersQueryDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        searchParams.append(key, query[key]!);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatIssuers(
      issuers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

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
    @Query() query: GetIssuerAttributesQueryDto,
  ): Promise<PaginatedListWithoutTotal<IdLink>> {
    const { did } = params;
    const where: Attribute_filter = {
      ...(query["issuer-type"] && {
        lastRevision_: {
          issuerType: query["issuer-type"],
        },
      }),
    };

    const attributes = await this.issuersService.getAttributes(
      did,
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/attributes`;

    const extraQuery = query["issuer-type"]
      ? `&issuer-type=${query["issuer-type"]}`
      : "";

    return formatAttributes(
      attributes,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
  @Get("/:did/attributes/:attributeId")
  @UsePipes(validationPipe)
  async getIssuerAttribute(
    @Param() params: GetIssuerAttributeParamsDto,
  ): Promise<AttributeDetailsObject> {
    const { attributeId, did } = params;

    const attribute = await this.issuersService.getAttribute(did, attributeId);

    return {
      attribute,
      did,
    };
  }

  @Accepts("application/json")
  @Get("/:did/proxies")
  @UsePipes(validationPipe)
  async getIssuerProxies(
    @Param() params: GetIssuerParamsDto,
    @Query() query: PaginationQuery,
  ): Promise<PaginatedListWithoutTotal<ProxyLink>> {
    const { did } = params;

    const proxies = await this.issuersService.getIssuerProxies(
      did,
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/proxies`;

    return formatProxies(
      proxies,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
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
  @Get("/:did/attributes/:attributeId/revisions")
  @UsePipes(validationPipe)
  async issuerAttributeIdRevisions(
    @Param() params: GetIssuerAttributeParamsDto,
    @Query() query: PaginationQuery,
  ): Promise<PaginatedListWithoutTotal<AttributeObject>> {
    const { attributeId, did } = params;

    const revisions = await this.issuersService.getRevisions(
      did,
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
