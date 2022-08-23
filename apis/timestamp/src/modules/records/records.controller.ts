import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timestamp } from "@ebsiint-sc/timestamp";
import RecordsService from "./records.service";
import { formatRecords, formatRecordVersions } from "./records.formatter";
import {
  RecordLink,
  RecordResponseObject,
  RecordVersionResponseObject,
  VersionLink,
} from "./records.interface";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import GetRecordsDto from "./dto/get-records.dto";
import GetRecordDto from "./dto/get-record.dto";
import GetRecordVersionsDto from "./dto/get-record-versions.dto";
import GetRecordVersionDto from "./dto/get-record-version.dto";

@Controller("/records")
export default class RecordsController {
  constructor(
    private recordsService: RecordsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getRecords(
    @Query() query: GetRecordsDto
  ): Promise<PaginatedList<RecordLink>> {
    let records: AsyncReturnType<Timestamp["getRecordIds"]>;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];
    let extraQuery = "";

    if (query["first-version"]) {
      extraQuery = `&first-version=${query["first-version"]}`;
      records = await this.recordsService.getRecordIdsByFirstVersionHash(
        query["first-version"],
        pageAfter,
        pageSize
      );
    } else if (query.owner) {
      extraQuery = `&owner=${query.owner}`;
      records = await this.recordsService.getRecordIdsByOwnerId(
        query.owner,
        pageAfter,
        pageSize
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
    @Param() params: GetRecordDto
  ): Promise<RecordResponseObject> {
    const { recordId } = params;
    return this.recordsService.getRecord(recordId);
  }

  @Get("/:recordId/versions")
  async getRecordVersions(
    @Param() params: GetRecordDto,
    @Query() query: GetRecordVersionsDto
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
      baseUrl
    );
  }

  @Get("/:recordId/versions/:versionId")
  async getRecordVersion(
    @Param() params: GetRecordVersionDto
  ): Promise<RecordVersionResponseObject> {
    const { recordId, versionId } = params;
    return this.recordsService.getRecordVersion(recordId, versionId);
  }
}
