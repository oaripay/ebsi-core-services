import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SmartContractsService } from "./smart-contracts.service";
import {
  formatSmartContracts,
  formatRevisions,
} from "./smart-contracts.formatter";
import {
  GetSmartContractsResponse,
  GetRevisionsResponse,
} from "./smart-contracts.interface";
import {
  GetSmartContractParams,
  GetSmartContractsQuery,
  GetRevisionParams,
  GetRevisionsQuery,
} from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/smart-contracts")
export class SmartContractsController {
  constructor(
    private smartContractsService: SmartContractsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getSmartContracts(
    @Query() query: GetSmartContractsQuery
  ): Promise<PaginatedList<GetSmartContractsResponse>> {
    const smartContracts = await this.smartContractsService.getSmartContracts(
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
    return this.smartContractsService.getSmartContract(smartContractInfoId);
  }

  @Get("/:smartContractInfoId/revisions")
  async getSmartContractRevisions(
    @Query() query: GetRevisionsQuery,
    @Param() params: GetSmartContractParams
  ): Promise<PaginatedList<GetRevisionsResponse>> {
    const { smartContractInfoId } = params;

    const revisions =
      await this.smartContractsService.getSmartContractRevisions(
        smartContractInfoId,
        query["page[after]"],
        query["page[size]"]
      );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/smart-contracts/${smartContractInfoId}/revisions`;

    return formatRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:smartContractInfoId/revisions/:revisionHash")
  @Header("Content-Type", "application/ld+json")
  async getSmartContractRevision(
    @Param() params: GetRevisionParams
  ): Promise<unknown> {
    const { smartContractInfoId, revisionHash } = params;

    return this.smartContractsService.getSmartContractRevision(
      smartContractInfoId,
      revisionHash
    );
  }
}

export default SmartContractsController;
