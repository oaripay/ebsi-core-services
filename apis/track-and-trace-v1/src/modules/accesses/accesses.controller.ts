import { Accepts, paginate } from "@ebsiint-api/shared";
import { Controller, Get, Head, HttpCode, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type { Access } from "./accesses.interface.js";

import AccessesService from "./accesses.service.js";
import { HeadAccessesDto, SubjectAccessesDto } from "./dto/index.js";

@Controller("/accesses")
export default class AccessesController {
  constructor(
    private accessesService: AccessesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("")
  async getAccessesBySubject(@Query() query: SubjectAccessesDto) {
    const { "page[after]": pageAfter, "page[size]": pageSize, subject } = query;
    const allItems = await this.accessesService.getAccessesBySubject(subject);
    const total = allItems.length;
    const items = allItems.slice(
      (pageAfter - 1) * pageSize,
      pageAfter * pageSize,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/accesses`;

    return paginate<Access>(
      items,
      baseUrl,
      total,
      pageAfter,
      pageSize,
      `&subject=${query.subject}`,
    );
  }

  @Head("")
  @HttpCode(204)
  async isCreator(@Query() query: HeadAccessesDto): Promise<void> {
    const { creator } = query;

    await this.accessesService.isCreator(creator);
  }
}
