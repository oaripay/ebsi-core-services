import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import RecordsService from "./records.service";
import { formatRecords } from "./records.formatter";
import { RecordLink, RecordResponseObject } from "./records.interface";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";
import { Timestamp } from "../../contracts/timestamp";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import GetRecordsDto from "./dto/get-records.dto";
import GetRecordDto from "./dto/get-record.dto";

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
}
