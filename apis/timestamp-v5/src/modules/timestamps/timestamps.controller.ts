import { Accepts, PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";

import { TimestampSet_filter } from "../../../.graphclient/index.js";
import { GetTimestampDto, GetTimestampsDto } from "./dto/index.js";
import { formatTimestamps } from "./timestamps.formatter.js";
import {
  TimestampLink,
  TimestampResponseObject,
} from "./timestamps.interface.js";
import TimestampsService from "./timestamps.service.js";

@Controller("/timestamps")
export default class TimestampsController {
  constructor(
    private timestampsService: TimestampsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("/:timestampId")
  async getTimestamp(
    @Param() params: GetTimestampDto,
  ): Promise<TimestampResponseObject> {
    const { timestampId } = params;
    return this.timestampsService.getTimestamp(timestampId);
  }

  @Accepts("application/json")
  @Get("")
  async getTimestamps(
    @Query() query: GetTimestampsDto,
  ): Promise<PaginatedListWithoutTotal<TimestampLink>> {
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const where: TimestampSet_filter = {
      ...(query.creator && { creator: query.creator }),
      ...(query["hash-algorithm-id"] && {
        hashAlgorithmId: query["hash-algorithm-id"],
      }),
    };

    const timestamps = await this.timestampsService.getTimestamps(
      pageAfter,
      pageSize,
      where,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/timestamps`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetTimestampsDto;
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

    return formatTimestamps(
      timestamps,
      pageAfter,
      pageSize,
      baseUrl,
      extraQuery,
    );
  }
}
