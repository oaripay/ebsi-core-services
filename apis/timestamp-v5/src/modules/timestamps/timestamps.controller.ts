import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Accepts, PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import TimestampsService from "./timestamps.service.js";
import { formatTimestamps } from "./timestamps.formatter.js";
import {
  TimestampLink,
  TimestampResponseObject,
} from "./timestamps.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetTimestampsDto, GetTimestampDto } from "./dto/index.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { TimestampSet_filter } from "../../../.graphclient/index.js";

@Controller("/timestamps")
export default class TimestampsController {
  constructor(
    private timestampsService: TimestampsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  @Accepts("application/json")
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

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/timestamps`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof GetTimestampsDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]!);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return formatTimestamps(
      timestamps,
      pageAfter,
      pageSize,
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:timestampId")
  @Accepts("application/json")
  async getTimestamp(
    @Param() params: GetTimestampDto,
  ): Promise<TimestampResponseObject> {
    const { timestampId } = params;
    return this.timestampsService.getTimestamp(timestampId);
  }
}
