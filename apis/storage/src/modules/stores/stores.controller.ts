import { Controller, Get, Query, Param, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StoresService } from "./stores.service";
import { GetStoreDto, GetStoresDto } from "./dto";
import { formatStores } from "./stores.formatter";
import { ApiConfig } from "../../config/configuration";
import { PaginatedList } from "../../shared/interfaces";

@Controller("/stores")
export class StoresController {
  constructor(
    private storesService: StoresService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get()
  getStores(@Query() query: GetStoresDto): PaginatedList<string> {
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
