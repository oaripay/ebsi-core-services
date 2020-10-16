import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AdministratorsService from "./administrators.service";
import formatAdministrators from "./administrators.formatter";
import {
  AdministratorsListResponseObject,
  AdministratorResponseObject,
} from "./types/administrators.interface";
import QueryPagination from "./types/query.interface";
import { ConfigObject } from "../../config/configuration";

@Controller("/administrators")
export default class AdministratorsController {
  constructor(
    private administratorsService: AdministratorsService,
    private configService: ConfigService<ConfigObject>
  ) {}

  @Get("")
  async administrators(
    @Query() query: QueryPagination
  ): Promise<AdministratorsListResponseObject> {
    const howMany = parseInt(query["page[size]"] ?? "10", 10);
    const page = parseInt(query["page[after]"] ?? "0", 10);

    const administrators = await this.administratorsService.getAdministrators(
      page,
      howMany
    );
    const { items, total, pageSize, prev, next } = formatAdministrators(
      administrators
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");

    return {
      self: `${domain}${apiUrlPrefix}/administrators`,
      items,
      total,
      pageSize,
      links: {
        first: `${apiUrlPrefix}/administrators?page[after]=0&page[size]=${pageSize}`,
        prev: `${apiUrlPrefix}/administrators?page[after]=${prev}&page[size]=${pageSize}`,
        next: `${apiUrlPrefix}/administrators?page[after]=${next}&page[size]=${pageSize}`,
        last: `${apiUrlPrefix}/administrators?page[after]=${parseInt(
          Number((total - 1) / pageSize).toString(),
          10
        )}&page[size]=${pageSize}`,
      },
    };
  }

  @Get("/:did")
  async administrator(
    @Param() params: { did?: string }
  ): Promise<AdministratorResponseObject> {
    const { did } = params;
    return this.administratorsService.getAdministrator(did);
  }
}
