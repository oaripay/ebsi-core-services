import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timestamp } from "@ebsiint-sc/timestamp-v2";
import { PaginatedList } from "@ebsiint-api/shared";
import RecordsService from "./records.service.js";
import { formatRecords, formatRecordVersions } from "./records.formatter.js";
import {
  RecordLink,
  RecordResponseObject,
  RecordVersionResponseObject,
  VersionLink,
} from "./records.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import GetRecordsDto from "./dto/get-records.dto.js";
import GetRecordDto from "./dto/get-record.dto.js";
import GetRecordVersionsDto from "./dto/get-record-versions.dto.js";
import GetRecordVersionDto from "./dto/get-record-version.dto.js";

@Controller("/records")
export default class RecordsController {
  constructor(
    private recordsService: RecordsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getRecords(
    @Query() query: GetRecordsDto,
  ): Promise<PaginatedList<RecordLink>> {
    let records: Awaited<ReturnType<Timestamp["getRecordIds"]>>;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];
    let extraQuery = "";

    if (query["first-version"]) {
      extraQuery = `&first-version=${query["first-version"]}`;
      records = await this.recordsService.getRecordIdsByFirstVersionHash(
        query["first-version"],
        pageAfter,
        pageSize,
      );
    } else if (query.owner) {
      extraQuery = `&owner=${query.owner}`;
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

    return formatRecords(records, pageAfter, pageSize, baseUrl, extraQuery);
  }

  @Get("/:recordId")
  async getRecord(
    @Param() params: GetRecordDto,
  ): Promise<RecordResponseObject> {
    const { recordId } = params;
    return this.recordsService.getRecord(recordId);
  }

  @Get("/:recordId/versions")
  async getRecordVersions(
    @Param() params: GetRecordDto,
    @Query() query: GetRecordVersionsDto,
  ): Promise<PaginatedList<VersionLink>> {
    const { recordId } = params;
    const totalVersions = await this.recordsService.getRecordVersions(recordId);

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/records/${recordId}/versions`;

    return formatRecordVersions(
      totalVersions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:recordId/versions/:versionId")
  async getRecordVersion(
    @Param() params: GetRecordVersionDto,
  ): Promise<RecordVersionResponseObject> {
    const { recordId, versionId } = params;
    return this.recordsService.getRecordVersion(recordId, versionId);
  }
}
