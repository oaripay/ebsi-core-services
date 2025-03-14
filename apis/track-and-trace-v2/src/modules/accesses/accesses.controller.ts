import {
  Accepts,
  BadRequestError,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import { Controller, Get, Head, HttpCode, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Invitation_filter } from "../../../.graphclient/index.js";
import type { ApiConfig } from "../../config/configuration.ts";
import type { Access } from "./accesses.interface.ts";

import { didToHex } from "../../shared/utils.ts";
import { AccessesService } from "./accesses.service.ts";
import { HeadAccessesDto, SubjectAccessesDto } from "./dto/index.ts";

@Controller("/accesses")
export class AccessesController {
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
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
}
