import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Accepts, PaginatedList } from "@ebsiint-api/shared";
import { HashAlgorithmsService } from "./hash-algorithms.service.js";
import { formatHashAlgorithms } from "./hash-algorithms.formatter.js";
import {
  HashAlgorithmLink,
  HashAlgorithmResponseObject,
} from "./hash-algorithms.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetHashAlgorithmDto, GetHashAlgorithmsDto } from "./dto/index.js";

@Controller("/hash-algorithms")
export class HashAlgorithmsController {
  constructor(
    private hashAlgorithmsService: HashAlgorithmsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  @Accepts("application/json")
  async getHahsAlgorithms(
    @Query() query: GetHashAlgorithmsDto,
  ): Promise<PaginatedList<HashAlgorithmLink>> {
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const hashAlgorithms = await this.hashAlgorithmsService.getHashAlgorithms(
      pageAfter,
      pageSize,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/hash-algorithms`;

    return formatHashAlgorithms(hashAlgorithms, pageAfter, pageSize, baseUrl);
  }

  @Get("/:hashAlgorithmId")
  @Accepts("application/json")
  async getHashAlgorithm(
    @Param() params: GetHashAlgorithmDto,
  ): Promise<HashAlgorithmResponseObject> {
    const { hashAlgorithmId } = params;
    return this.hashAlgorithmsService.getHashAlgorithm(hashAlgorithmId);
  }
}

export default HashAlgorithmsController;
