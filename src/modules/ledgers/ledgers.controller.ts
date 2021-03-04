import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LedgersService } from "./ledgers.service";
import { formatLedgers } from "./ledgers.formatter";
import { GetLedgersResponse } from "./ledgers.interface";
import { GetLedgerParams, GetLedgersQuery } from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/ledgers")
export class LedgersController {
  constructor(
    private ledgersService: LedgersService,
    private configService: ConfigService<ApiConfig>
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
}

export default LedgersController;
