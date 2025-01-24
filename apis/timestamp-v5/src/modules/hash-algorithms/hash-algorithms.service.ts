import { InternalServerError, NotFoundError } from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";

import type {
  GetHashAlgorithmQuery,
  GetHashAlgorithmsQuery,
  HashAlgo_filter,
} from "../../../.graphclient/index.js";
import type { HashAlgorithmResponseObject } from "./hash-algorithms.interface.js";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  async getHashAlgorithm(
    hashAlgorithmId: number,
  ): Promise<HashAlgorithmResponseObject> {
    let res: GetHashAlgorithmQuery;

    try {
      res = await sdk.GetHashAlgorithm({
        hashAlgorithmId: hashAlgorithmId.toString(),
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.hashAlgo) {
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
      });
    }

    const { ianaName, multiHash, oid, outputLength, status } = res.hashAlgo;

    return {
      ianaName,
      multihash: multiHash,
      oid,
      outputLengthBits: Number(outputLength),
      status,
    };
  }

  async getHashAlgorithms(
    page: number,
    pagesize: number,
    where: HashAlgo_filter = {},
  ): Promise<{ items: number[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetHashAlgorithmsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetHashAlgorithms({
        pagesize: queryPageSize,
        skip,
        where,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.hashAlgos) return { items: [] };

    const ids = res.hashAlgos.map((h) => Number(h.id));
    return { items: ids };
  }
}

export default HashAlgorithmsService;
