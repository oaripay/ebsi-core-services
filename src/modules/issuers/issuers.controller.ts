import { Controller, Get, Query, Param } from "@nestjs/common";
import IssuersService from "./issuers.service";
import formatIssuers from "./issuers.formatter";
import {
  IssuersListResponseObject,
  IssuerResponseObject,
} from "./types/issuers.interface";
import QueryPagination from "./types/query.interface";

const version = "v2";

@Controller("/trusted-issuers-registry")
export default class IssuersController {
  constructor(private issuersService: IssuersService) {}

  @Get("/v2/issuers")
  async issuers(
    @Query() query: QueryPagination
  ): Promise<IssuersListResponseObject> {
    const howMany = parseInt(query["page[size]"] ?? "10", 10);
    const page = parseInt(query["page[after]"] ?? "0", 10);

    const issuers = await this.issuersService.getIssuers(page, howMany);
    const { items, total, pageSize, prev, next } = formatIssuers(issuers);

    return {
      self: `${this.issuersService.getDomain()}/trusted-issuers-registry/${version}/issuers`,
      items,
      total,
      pageSize,
      links: {
        first: `/trusted-issuers-registry/${version}/issuers?page[after]=0&page[size]=${pageSize}`,
        prev: `/trusted-issuers-registry/${version}/issuers?page[after]=${prev}&page[size]=${pageSize}`,
        next: `/trusted-issuers-registry/${version}/issuers?page[after]=${next}&page[size]=${pageSize}`,
        last: `/trusted-issuers-registry/${version}/issuers?page[after]=${parseInt(
          Number((total - 1) / pageSize).toString(),
          10
        )}&page[size]=${pageSize}`,
      },
    };
  }

  @Get("/v2/issuers/:did")
  async issuer(
    @Param() params: { did?: string }
  ): Promise<IssuerResponseObject> {
    const { did } = params;
    return this.issuersService.getIssuer(did);
  }
}
