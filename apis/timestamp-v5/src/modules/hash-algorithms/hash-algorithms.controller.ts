import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import { HashAlgorithmsService } from "./hash-algorithms.service.js";
import { formatHashAlgorithms } from "./hash-algorithms.formatter.js";
import {
  HashAlgorithmLink,
  HashAlgorithmResponseObject,
} from "./hash-algorithms.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetHashAlgorithmDto, GetHashAlgorithmsDto } from "./dto/index.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { HashAlgo_filter } from "../../../.graphclient/index.js";

@Controller("/hash-algorithms")
export class HashAlgorithmsController {
  constructor(
    private hashAlgorithmsService: HashAlgorithmsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getHahsAlgorithms(
    @Query() query: GetHashAlgorithmsDto,
  ): Promise<PaginatedListWithoutTotal<HashAlgorithmLink>> {
    const where: HashAlgo_filter = {
      ...(query.iananame && { iananame: query.iananame }),
      ...(query.multihash && { multiHash: query.multihash }),
      ...(query.oid && { oid: query.oid }),
      ...(query["output-length"] && { outputLength: query["output-length"] }),
      ...(query.status && { status: query.status }),
    };

    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const hashAlgorithms = await this.hashAlgorithmsService.getHashAlgorithms(
      pageAfter,
      pageSize,
      where,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/hash-algorithms`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof GetHashAlgorithmsDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]!);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return formatHashAlgorithms(
      hashAlgorithms,
      pageAfter,
      pageSize,
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:hashAlgorithmId")
  async getHashAlgorithm(
    @Param() params: GetHashAlgorithmDto,
  ): Promise<HashAlgorithmResponseObject> {
    const { hashAlgorithmId } = params;
    return this.hashAlgorithmsService.getHashAlgorithm(hashAlgorithmId);
  }
}

export default HashAlgorithmsController;
