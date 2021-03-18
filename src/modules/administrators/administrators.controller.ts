import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AdministratorsService from "./administrators.service";
import { formatAdministrators } from "./administrators.formatter";
import {
  DidLink,
  AdministratorResponseObject,
} from "./administrators.interface";
import { PaginationQuery } from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/administrators")
export default class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getAdministrators(
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<DidLink>> {
    const administrators = await this.administratorsService.getAdministrators(
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/administrators`;

    return formatAdministrators(
      administrators,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:did")
  async getAdministrator(
    @Param() params: { did?: string }
  ): Promise<AdministratorResponseObject> {
    const { did } = params;
    return this.administratorsService.getAdministrator(did);
  }
}
