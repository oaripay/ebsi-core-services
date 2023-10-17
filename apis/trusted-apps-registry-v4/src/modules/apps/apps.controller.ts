import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedList, PaginationQuery } from "@ebsiint-api/shared";
import AppsService from "./apps.service.js";
import {
  formatApps,
  formatAuthorizations,
  formatPublicKeys,
} from "./apps.formatter.js";
import {
  AppResponseObject,
  AppLink,
  AppObject,
  AuthorizationResponseObject,
  AuthorizationItemObject,
  AuthorizationLink,
  PublicKeyLink,
  PublicKeyResponseObject,
} from "./apps.interface.js";
import GetAppsDto from "./dto/get-apps.dto.js";
import GetAppDto from "./dto/get-app.dto.js";
import GetAuthorizationDto from "./dto/get-authorization.dto.js";
import GetAuthorizationsParamDto from "./dto/get-authorizations-param.dto.js";
import GetAuthorizationsDto from "./dto/get-authorizations.dto.js";
import GetPublicKeysParamDto from "./dto/get-public-keys-param.dto.js";
import type { ApiConfig } from "../../config/configuration.js";
import GetPublicKeyDto from "./dto/get-public-key.dto.js";

@Controller("/apps")
export default class AppsController {
  constructor(
    private appsService: AppsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getApps(@Query() query: GetAppsDto): Promise<PaginatedList<AppLink>> {
    let apps: AppObject[] = [];
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];
    let extraQuery = "";

    const appIds = await this.appsService.getApps(pageAfter, pageSize);
    const total = appIds.total.toNumber();
    let tempTotal = 0;
    if (query.public_key_id) {
      extraQuery = `&public_key_id=${query.public_key_id}`;
      if (pageAfter === 1) {
        try {
          const appByPublicKeyId = await this.appsService.getAppByPublicKeyId(
            query.public_key_id,
          );
          apps.push({
            applicationId: appByPublicKeyId.applicationId,
            name: appByPublicKeyId.name,
          });
          tempTotal = 1;
        } catch (error) {
          /* empty */
        }
      }
    } else {
      apps = await Promise.all(
        appIds.items.map(async (appId) => {
          const app = await this.appsService.getAppById(appId);
          return {
            applicationId: appId,
            name: app.name,
          };
        }),
      );
      tempTotal = total;
    }

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/apps`;

    const responseApps = formatApps(
      apps,
      tempTotal,
      pageAfter,
      pageSize,
      baseUrl,
      extraQuery,
    );
    responseApps.total = total;
    return responseApps;
  }

  @Get("/:applicationName")
  async getApp(@Param() params: GetAppDto): Promise<AppResponseObject> {
    const { applicationName } = params;

    const app = await this.appsService.getApp(applicationName);

    return app;
  }

  @Get("/:applicationName/public-keys")
  async getPublicKeys(
    @Param() params: GetPublicKeysParamDto,
    @Query() query: PaginationQuery,
  ): Promise<PaginatedList<PublicKeyLink>> {
    const { applicationName } = params;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const publicKeys = await this.appsService.getPublicKeys(
      applicationName,
      pageAfter,
      pageSize,
    );
    const { total, items } = publicKeys;
    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/apps/${applicationName}/public-keys`;

    return formatPublicKeys(
      items,
      total.toNumber(),
      pageAfter,
      pageSize,
      baseUrl,
    );
  }

  @Get("/:applicationName/public-keys/:publicKeyId")
  async getPublicKey(
    @Param() params: GetPublicKeyDto,
  ): Promise<PublicKeyResponseObject> {
    const { applicationName, publicKeyId } = params;

    return this.appsService.getPublicKey(applicationName, publicKeyId);
  }

  @Get("/:applicationName/authorizations")
  async getAuthorizations(
    @Param() params: GetAuthorizationsParamDto,
    @Query() query: GetAuthorizationsDto,
  ): Promise<PaginatedList<AuthorizationLink>> {
    const { applicationName } = params;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    let authorizations: { items: AuthorizationItemObject[]; total: number };
    let extraQuery = "";
    if (query.requesterApplicationName) {
      authorizations =
        await this.appsService.getAuthorizationsByRequesterApplicationName(
          applicationName,
          query.requesterApplicationName,
          pageAfter,
          pageSize,
        );
      extraQuery = `&requesterApplicationName=${query.requesterApplicationName}`;
    } else {
      authorizations = await this.appsService.getAuthorizations(
        applicationName,
        pageAfter,
        pageSize,
      );
    }
    const { total, items } = authorizations;
    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/apps/${applicationName}/authorizations`;

    return formatAuthorizations(
      items,
      total,
      pageAfter,
      pageSize,
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:applicationName/authorizations/:authorizationId")
  async getAuthorization(
    @Param() params: GetAuthorizationDto,
  ): Promise<AuthorizationResponseObject> {
    const { applicationName, authorizationId } = params;

    const authorization = await this.appsService.getAuthorization(
      applicationName,
      authorizationId,
    );

    return authorization;
  }
}
