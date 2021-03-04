import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SmartContractsService } from "./smart-contracts.service";
import { formatSmartContracts } from "./smart-contracts.formatter";
import { GetSmartContractsResponse } from "./smart-contracts.interface";
import { GetSmartContractParams, GetSmartContractsQuery } from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/smart-contracts")
export class SmartContractsController {
  constructor(
    private ledgersService: SmartContractsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getSmartContracts(
    @Query() query: GetSmartContractsQuery
  ): Promise<PaginatedList<GetSmartContractsResponse>> {
    const smartContracts = await this.ledgersService.getSmartContracts(
      query["page[after]"],
      query["page[size]"],
      query.name
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/smart-contracts`;

    return formatSmartContracts(
      smartContracts,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.name
    );
  }

  @Get("/:smartContractInfoId")
  @Header("Content-Type", "application/ld+json")
  async getSmartContract(
    @Param() params: GetSmartContractParams
  ): Promise<unknown> {
    const { smartContractInfoId } = params;
    return this.ledgersService.getSmartContract(smartContractInfoId);
  }
}

export default SmartContractsController;
