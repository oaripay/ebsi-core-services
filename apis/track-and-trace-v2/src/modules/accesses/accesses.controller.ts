import { Controller, Head, Get, HttpCode, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Accepts, paginateWithoutTotal } from "@ebsiint-api/shared";
import AccessesService from "./accesses.service.js";
import { HeadAccessesDto, SubjectAccessesDto } from "./dto/index.js";
import type { ApiConfig } from "../../config/configuration.js";
import type { Access } from "./accesses.interface.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { Invitation_filter } from "../../../.graphclient/index.js";

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
  @Accepts("application/json")
  async getAccessesBySubject(@Query() query: SubjectAccessesDto) {
    const { subject, "page[after]": pageAfter, "page[size]": pageSize } = query;

    const where: Invitation_filter = {
      ...(query.permission && { type: query.permission }),
      ...(query["granted-by"] && { grantedBy: query["granted-by"] }),
    };

    const accesses = await this.accessesService.getAccessesBySubject(
      subject,
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/accesses`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof SubjectAccessesDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]!);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return paginateWithoutTotal<Access>(
      accesses.items,
      baseUrl,
      pageAfter,
      pageSize,
      extraQuery,
    );
  }
}
