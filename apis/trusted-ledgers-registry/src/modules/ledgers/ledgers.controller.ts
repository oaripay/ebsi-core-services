import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LedgersService } from "./ledgers.service";
import { formatLedgers, formatRevisions } from "./ledgers.formatter";
import { GetLedgersResponse, GetRevisionsResponse } from "./ledgers.interface";
import {
  GetLedgerParams,
  GetRevisionParams,
  GetLedgersQuery,
  GetRevisionsQuery,
} from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/ledgers")
export class LedgersController {
  constructor(
    private ledgersService: LedgersService,
    private configService: ConfigService<ApiConfig, true>
  ) {}

  @Get("")
  async getLedgers(
    @Query() query: GetLedgersQuery
  ): Promise<PaginatedList<GetLedgersResponse>> {
    const ledgers = await this.ledgersService.getLedgers(
      query["page[after]"],
      query["page[size]"],
      query.name
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/ledgers`;

    return formatLedgers(
      ledgers,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.name
    );
  }

  @Get("/:ledgerInfoId")
  @Header("Content-Type", "application/ld+json")
  async getLedger(@Param() params: GetLedgerParams): Promise<unknown> {
    const { ledgerInfoId } = params;
    return this.ledgersService.getLedger(ledgerInfoId);
  }

  @Get("/:ledgerInfoId/revisions")
  async getLedgerRevisions(
    @Query() query: GetRevisionsQuery,
    @Param() params: GetLedgerParams
  ): Promise<PaginatedList<GetRevisionsResponse>> {
    const { ledgerInfoId } = params;

    const revisions = await this.ledgersService.getLedgerRevisions(
      ledgerInfoId,
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/ledgers/${ledgerInfoId}/revisions`;

    return formatRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:ledgerInfoId/revisions/:revisionHash")
  @Header("Content-Type", "application/ld+json")
  async getLedgerRevision(
    @Param() params: GetRevisionParams
  ): Promise<unknown> {
    const { ledgerInfoId, revisionHash } = params;

    return this.ledgersService.getLedgerRevision(ledgerInfoId, revisionHash);
  }
}

export default LedgersController;
