import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HashAlgorithmsService } from "./hash-algorithms.service";
import { formatHashAlgorithms } from "./hash-algorithms.formatter";
import {
  HashAlgorithmLink,
  HashAlgorithmResponseObject,
} from "./hash-algorithms.interface";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";
import { GetHashAlgorithmDto, GetHashAlgorithmsDto } from "./dto";

@Controller("/hash-algorithms")
export class HashAlgorithmsController {
  constructor(
    private hashAlgorithmsService: HashAlgorithmsService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getHahsAlgorithms(
    @Query() query: GetHashAlgorithmsDto
  ): Promise<PaginatedList<HashAlgorithmLink>> {
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const hashAlgorithms = await this.hashAlgorithmsService.getHashAlgorithms(
      pageAfter,
      pageSize
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/hash-algorithms`;

    return formatHashAlgorithms(hashAlgorithms, pageAfter, pageSize, baseUrl);
  }

  @Get("/:hashAlgorithmId")
  async getHashAlgorithm(
    @Param() params: GetHashAlgorithmDto
  ): Promise<HashAlgorithmResponseObject> {
    const { hashAlgorithmId } = params;
    return this.hashAlgorithmsService.getHashAlgorithm(hashAlgorithmId);
  }
}

export default HashAlgorithmsController;
