import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TimestampsService from "./timestamps.service";
import { formatTimestamps } from "./timestamps.formatter";
import { TimestampLink, TimestampResponseObject } from "./timestamps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";
import { GetTimestampsDto, GetTimestampDto } from "./dto";

@Controller("/timestamps")
export default class TimestampsController {
  constructor(
    private timestampsService: TimestampsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getTimestamps(
    @Query() query: GetTimestampsDto
  ): Promise<PaginatedList<TimestampLink>> {
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const timestamps = await this.timestampsService.getTimestamps(
      pageAfter,
      pageSize
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/timestamps`;

    return formatTimestamps(timestamps, pageAfter, pageSize, baseUrl);
  }

  @Get("/:timestampId")
  async getTimestamp(
    @Param() params: GetTimestampDto
  ): Promise<TimestampResponseObject> {
    const { timestampId } = params;
    return this.timestampsService.getTimestamp(timestampId);
  }
}
