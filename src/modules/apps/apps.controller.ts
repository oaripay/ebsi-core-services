import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AppsService from "./apps.service";
import { formatApps } from "./apps.formatter";
import { AppResponseObject, AppLink, AppObject } from "./apps.interface";
import GetAppsDto from "./dto/get-apps.dto";
import GetAppDto from "./dto/get-app.dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/apps")
export default class AppsController {
  constructor(
    private appsService: AppsService,
    private configService: ConfigService<ApiConfig>
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
    if (query.name) {
      extraQuery = `&name=${query.name}`;
      if (pageAfter === 1) {
        try {
          const appByName = await this.appsService.getAppByName(query.name);
          apps.push({
            applicationId: appByName.applicationId,
            name: query.name,
          });
          tempTotal = 1;
        } catch (error) {
          /* empty */
        }
      }
    } else if (query.public_key_id) {
      extraQuery = `&public_key_id=${query.public_key_id}`;
      if (pageAfter === 1) {
        try {
          const appByPublicKeyId = await this.appsService.getAppByPublicKeyId(
            query.public_key_id
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
          const appByPublicKeyId = await this.appsService.getAppByPublicKeyId(
            appId
          );
          return {
            applicationId: appByPublicKeyId.applicationId,
            name: appByPublicKeyId.name,
          };
        })
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
      extraQuery
    );
    responseApps.total = total;
    return responseApps;
  }

  @Get("/:applicationId")
  async getApp(@Param() params: GetAppDto): Promise<AppResponseObject> {
    const { applicationId } = params;

    const app = await this.appsService.getApp(applicationId);

    return app;
  }
}
