import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IdentifiersService from "./identifiers.service";
import { formatIdentifiers } from "./identifiers.formatter";
import { DidLink } from "./identifiers.interface";
import { GetIdentifiersDto } from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/identifiers")
export default class IdentifiersController {
  constructor(
    private didMethodsService: IdentifiersService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getIdentifiers(
    @Query() query: GetIdentifiersDto
  ): Promise<PaginatedList<DidLink>> {
    const didMethods = await this.didMethodsService.getIdentifiers(
      query["page[after]"],
      query["page[size]"],
      query.controller
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers`;

    return formatIdentifiers(
      didMethods,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.controller
    );
  }

  @Get("/:did")
  @Header("Content-Type", "application/did+ld+json")
  async getIdentifier(
    @Param() params: { did?: string }
  ): Promise<{ [x: string]: unknown }> {
    const { did } = params;
    return this.didMethodsService.getIdentifier(did);
  }
}
