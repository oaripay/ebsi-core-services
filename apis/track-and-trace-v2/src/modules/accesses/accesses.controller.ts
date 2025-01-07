import {
  Accepts,
  BadRequestError,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import { Controller, Get, Head, HttpCode, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type { Access } from "./accesses.interface.js";

import { Invitation_filter } from "../../../.graphclient/index.js";
import { didToHex } from "../../shared/utils.js";
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

    let grantedBy: string | undefined;

    try {
      if (query["granted-by"]) {
        grantedBy = await didToHex(query["granted-by"]);
      }
    } catch {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "granted-by must be a DID",
      });
    }

    const where: Invitation_filter = {
      ...(query.permission && { type: query.permission }),
      ...(grantedBy && { grantedBy }),
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
    for (const k of Object.keys(query)) {
      const key = k as keyof SubjectAccessesDto;
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

    return paginateWithoutTotal<Access>(
      accesses.items,
      baseUrl,
      pageAfter,
      pageSize,
      extraQuery,
    );
  }

  @Head("")
  @HttpCode(204)
  async isCreator(@Query() query: HeadAccessesDto): Promise<void> {
    const { creator } = query;

    await this.accessesService.isCreator(creator);
  }
}
