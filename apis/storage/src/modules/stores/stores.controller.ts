import { Controller, Get, Query, Param, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaginatedList2 } from "@ebsiint-api/shared";
import { StoresService } from "./stores.service.js";
import { GetStoreDto, GetStoresDto } from "./dto/index.js";
import { formatStores } from "./stores.formatter.js";
import type { ApiConfig } from "../../config/configuration.js";

@Controller("/stores")
export class StoresController {
  constructor(
    private storesService: StoresService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get()
  getStores(@Query() query: GetStoresDto): PaginatedList2<string> {
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const stores = this.storesService.getStores(pageAfter, pageSize);

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/stores`;

    return formatStores(stores, pageAfter, pageSize, baseUrl);
  }

  @HttpCode(204)
  @Get("/:store")
  getStore(@Param() params: GetStoreDto): void {
    const { store } = params;
    this.storesService.getStore(store);
  }
}

export default StoresController;
