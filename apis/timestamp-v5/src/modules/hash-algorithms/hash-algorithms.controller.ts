import { Accepts, PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";

import { HashAlgo_filter } from "../../../.graphclient/index.js";
import { GetHashAlgorithmDto, GetHashAlgorithmsDto } from "./dto/index.js";
import { formatHashAlgorithms } from "./hash-algorithms.formatter.js";
import {
  HashAlgorithmLink,
  HashAlgorithmResponseObject,
} from "./hash-algorithms.interface.js";
import { HashAlgorithmsService } from "./hash-algorithms.service.js";

@Controller("/hash-algorithms")
export class HashAlgorithmsController {
  constructor(
    private hashAlgorithmsService: HashAlgorithmsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
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
    for (const k of Object.keys(query)) {
      const key = k as keyof GetHashAlgorithmsDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        searchParams.append(key, query[key]!);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatHashAlgorithms(
      hashAlgorithms,
      pageAfter,
      pageSize,
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
  @Get("/:hashAlgorithmId")
  async getHashAlgorithm(
    @Param() params: GetHashAlgorithmDto,
  ): Promise<HashAlgorithmResponseObject> {
    const { hashAlgorithmId } = params;
    return this.hashAlgorithmsService.getHashAlgorithm(hashAlgorithmId);
  }
}

export default HashAlgorithmsController;
