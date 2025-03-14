import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { HashAlgo_filter } from "../../../.graphclient/index.js";
import type { ApiConfig } from "../../config/configuration.ts";
import type {
  HashAlgorithmLink,
  HashAlgorithmResponseObject,
} from "./hash-algorithms.interface.ts";

import { GetHashAlgorithmDto, GetHashAlgorithmsDto } from "./dto/index.ts";
import { formatHashAlgorithms } from "./hash-algorithms.formatter.ts";
import { HashAlgorithmsService } from "./hash-algorithms.service.ts";

@Controller("/hash-algorithms")
export class HashAlgorithmsController {
  constructor(
    private hashAlgorithmsService: HashAlgorithmsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("")
  async getHashAlgorithms(
    @Query() query: GetHashAlgorithmsDto,
  ): Promise<PaginatedListWithoutTotal<HashAlgorithmLink>> {
    const where: HashAlgo_filter = {
      ...(query.iananame && { ianaName: query.iananame }),
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
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
