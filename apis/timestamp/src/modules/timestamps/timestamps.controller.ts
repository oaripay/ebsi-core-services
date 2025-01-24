import type { PaginatedList } from "@ebsiint-api/shared";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  TimestampLink,
  TimestampResponseObject,
} from "./timestamps.interface.js";

import { GetTimestampDto, GetTimestampsDto } from "./dto/index.js";
import { formatTimestamps } from "./timestamps.formatter.js";
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
  ): Promise<PaginatedList<TimestampLink>> {
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const timestamps = await this.timestampsService.getTimestamps(
      pageAfter,
      pageSize,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/timestamps`;

    return formatTimestamps(timestamps, pageAfter, pageSize, baseUrl);
  }
}
