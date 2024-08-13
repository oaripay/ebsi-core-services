import { Controller, Head, Get, HttpCode, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { paginateWithoutTotal } from "@ebsiint-api/shared";
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
    const accesses = await this.accessesService.getAccessesBySubject(
      subject,
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/accesses`;

    return paginateWithoutTotal<Access>(
      accesses.items,
      baseUrl,
      pageAfter,
      pageSize,
      `&subject=${query.subject}`,
    );
  }
}
