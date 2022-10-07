import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DidTimestampsService } from "./did-timestamps.service";
import { formatDidTimestamps } from "./did-timestamps.formatter";
import {
  TimestampLink,
  DidTimestampResponseObject,
} from "./did-timestamps.interface";
import { GetTimestampParamsDto, GetTimestampsQueryDto } from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/did-timestamps")
export class DidTimestampsController {
  constructor(
    private didTimestampsService: DidTimestampsService,
    private configService: ConfigService<ApiConfig, true>
  ) {}

  @Get("")
  async getDidTimestamps(
    @Query() query: GetTimestampsQueryDto
  ): Promise<PaginatedList<TimestampLink>> {
    const didTimestamps = await this.didTimestampsService.getDidTimestamps(
      query["page[after]"],
      query["page[size]"],
      query.identifier,
      query["version-id"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/did-timestamps`;

    return formatDidTimestamps(
      didTimestamps,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.identifier,
      query["version-id"]
    );
  }

  @Get("/:timestampId")
  async getDidTimestamp(
    @Param() params: GetTimestampParamsDto
  ): Promise<DidTimestampResponseObject> {
    const { timestampId } = params;
    return this.didTimestampsService.getDidTimestamp(timestampId);
  }
}

export default DidTimestampsController;
