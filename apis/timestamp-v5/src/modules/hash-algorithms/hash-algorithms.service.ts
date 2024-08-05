import { Injectable, Logger } from "@nestjs/common";
import { InternalServerError, NotFoundError } from "@ebsiint-api/shared";
import { HashAlgorithmResponseObject } from "./hash-algorithms.interface.js";
import {
  getBuiltGraphSDK,
  GetHashAlgorithmsQuery,
  GetHashAlgorithmQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  async getHashAlgorithms(
    page: number,
    pagesize: number,
  ): Promise<{ items: number[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetHashAlgorithmsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetHashAlgorithms({ skip, pagesize: queryPageSize });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const ids = res.hashAlgos.map((h) => Number(h.id));
    return { items: ids };
  }

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

    const { outputLength, ianaName, oid, status, multiHash } = res.hashAlgo;

    return {
      outputLengthBits: Number(outputLength),
      ianaName,
      oid,
      status,
      multihash: multiHash,
    };
  }
}

export default HashAlgorithmsService;
