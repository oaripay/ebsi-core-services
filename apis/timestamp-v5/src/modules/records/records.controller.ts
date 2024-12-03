import { Accepts, PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";

import GetRecordVersionDto from "./dto/get-record-version.dto.js";
import GetRecordVersionsDto from "./dto/get-record-versions.dto.js";
import GetRecordDto from "./dto/get-record.dto.js";
import GetRecordsDto from "./dto/get-records.dto.js";
import { formatRecords, formatRecordVersions } from "./records.formatter.js";
import {
  RecordLink,
  RecordResponseObject,
  RecordVersionResponseObject,
  VersionLink,
} from "./records.interface.js";
import RecordsService from "./records.service.js";

@Controller("/records")
export default class RecordsController {
  constructor(
    private recordsService: RecordsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("/:recordId")
  async getRecord(
    @Param() params: GetRecordDto,
  ): Promise<RecordResponseObject> {
    const { recordId } = params;
    return this.recordsService.getRecord(recordId);
  }

  @Accepts("application/json")
  @Get("")
  async getRecords(
    @Query() query: GetRecordsDto,
  ): Promise<PaginatedListWithoutTotal<RecordLink>> {
    let records: { items: string[] };
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    if (query["first-version"]) {
      records = await this.recordsService.getRecordIdsByFirstVersionHash(
        query["first-version"],
        pageAfter,
        pageSize,
      );
    } else if (query.owner) {
      records = await this.recordsService.getRecordIdsByOwnerId(
        query.owner,
        pageAfter,
        pageSize,
      );
    } else {
      records = await this.recordsService.getRecordIds(pageAfter, pageSize);
    }

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/records`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetRecordsDto;
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

    return formatRecords(records, pageAfter, pageSize, baseUrl, extraQuery);
  }

  @Accepts("application/json")
  @Get("/:recordId/versions/:versionId")
  async getRecordVersion(
    @Param() params: GetRecordVersionDto,
  ): Promise<RecordVersionResponseObject> {
    const { recordId, versionId } = params;
    return this.recordsService.getRecordVersion(recordId, versionId);
  }

  @Accepts("application/json")
  @Get("/:recordId/versions")
  async getRecordVersions(
    @Param() params: GetRecordDto,
    @Query() query: GetRecordVersionsDto,
  ): Promise<PaginatedListWithoutTotal<VersionLink>> {
    const { recordId } = params;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];
    const versions = await this.recordsService.getRecordVersions(
      recordId,
      pageAfter,
      pageSize,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/records/${recordId}/versions`;

    return formatRecordVersions(
      versions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }
}
