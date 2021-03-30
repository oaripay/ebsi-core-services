import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import DidMethodsService from "./did-methods.service";
import { formatDidMethods } from "./did-methods.formatter";
import { NameLink, DidMethodResponseObject } from "./did-methods.interface";
import { PaginationQuery } from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/did-methods")
export default class DidMethodsController {
  constructor(
    private didMethodsService: DidMethodsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getDidMethods(
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<NameLink>> {
    const didMethods = await this.didMethodsService.getDidMethods(
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/did-methods`;

    return formatDidMethods(
      didMethods,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:name")
  async getDidMethod(
    @Param() params: { name: string }
  ): Promise<DidMethodResponseObject> {
    const { name } = params;
    return this.didMethodsService.getDidMethod(name);
  }
}
