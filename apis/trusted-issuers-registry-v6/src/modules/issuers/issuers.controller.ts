import {
  Controller,
  Get,
  Query,
  Param,
  Req,
  Header,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Accepts,
  PaginatedListWithoutTotal,
  PaginationQuery,
} from "@ebsiint-api/shared";
import type { FastifyRequest } from "fastify";
import { IssuersService } from "./issuers.service.js";
import {
  formatIssuers,
  formatAttributes,
  formatRevisions,
  formatProxies,
} from "./issuers.formatter.js";
import {
  IdLink,
  IssuerResponseObject,
  AttributeObject,
  AttributeDetailsObject,
  DidLink,
  IssuerProxyResponseObject,
  ProxyLink,
} from "./issuers.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import {
  GetIssuerAttributeParamsDto,
  GetIssuerAttributesQueryDto,
  GetIssuerParamsDto,
  GetIssuerProxyParamsDto,
  GetIssuersQueryDto,
} from "./dto/index.js";
import {
  Attribute_filter,
  Issuer_filter,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller("/issuers")
export class IssuersController {
  constructor(
    private issuersService: IssuersService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  @Accepts("application/json")
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
    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof GetIssuersQueryDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]!);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return formatIssuers(
      issuers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:did")
  @Accepts("application/json")
  @UsePipes(validationPipe)
  async getIssuer(
    @Param() params: GetIssuerParamsDto,
  ): Promise<IssuerResponseObject> {
    const { did } = params;
    return this.issuersService.getIssuer(did);
  }

  @Get("/:did/attributes")
  @Accepts("application/json")
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

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
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

  @Get("/:did/attributes/:attributeId")
  @Accepts("application/json")
  @UsePipes(validationPipe)
  async issuerAttributeId(
    @Param() params: GetIssuerAttributeParamsDto,
  ): Promise<AttributeDetailsObject> {
    const { did, attributeId } = params;

    const attribute = await this.issuersService.getAttribute(did, attributeId);

    return {
      did,
      attribute,
    };
  }

  @Get("/:did/attributes/:attributeId/revisions")
  @Accepts("application/json")
  @UsePipes(validationPipe)
  async issuerAttributeIdRevisions(
    @Param() params: GetIssuerAttributeParamsDto,
    @Query() query: PaginationQuery,
  ): Promise<PaginatedListWithoutTotal<AttributeObject>> {
    const { did, attributeId } = params;

    const revisions = await this.issuersService.getRevisions(
      did,
      attributeId,
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/attributes/${attributeId}/revisions`;

    return formatRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:did/proxies")
  @Accepts("application/json")
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

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/issuers/${did}/proxies`;

    return formatProxies(
      proxies,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:did/proxies/:proxyId")
  @Accepts("application/json")
  @UsePipes(validationPipe)
  async getIssuerProxy(
    @Param() params: GetIssuerProxyParamsDto,
  ): Promise<IssuerProxyResponseObject> {
    const { did, proxyId } = params;

    return this.issuersService.getIssuerProxy(did, proxyId);
  }

  @Get("/:did/proxies/:proxyId/*")
  @Accepts("text/plain")
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
