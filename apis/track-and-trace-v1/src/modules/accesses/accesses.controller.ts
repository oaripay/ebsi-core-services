import { Controller, Head, Get, HttpCode, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { paginate } from "@ebsiint-api/shared";
import AccessesService from "./accesses.service.js";
import { HeadAccessesDto, SubjectAccessesDto } from "./dto/index.js";
import type { ApiConfig } from "../../config/configuration.js";
import type { Access } from "./accesses.interface.js";

@Controller("/accesses")
export default class AccessesController {
  constructor(
    private accessesService: AccessesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Head("")
  @HttpCode(204)
  async isCreator(@Query() query: HeadAccessesDto): Promise<void> {
    const { creator } = query;

    await this.accessesService.isCreator(creator);
  }

  @Get("")
  async getAccessesBySubject(@Query() query: SubjectAccessesDto) {
    const { subject, "page[after]": pageAfter, "page[size]": pageSize } = query;
    const allItems = await this.accessesService.getAccessesBySubject(subject);
    const total = allItems.length;
    const items = allItems.slice(
      (pageAfter - 1) * pageSize,
      pageAfter * pageSize,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
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
}
