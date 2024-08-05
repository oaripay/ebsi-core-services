import { Injectable, Logger } from "@nestjs/common";
import type { HashName } from "multihashes";
import {
  multibase,
  multihashEncode,
  multihashDecode,
  InternalServerError,
  NotFoundError,
} from "@ebsiint-api/shared";
import { TimestampResponseObject } from "./timestamps.interface.js";
import {
  getBuiltGraphSDK,
  GetTimestampsQuery,
  GetTimestampQuery,
  GetHashAlgorithmQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class TimestampsService {
  private readonly logger = new Logger(TimestampsService.name);

  async getTimestamps(
    page: number,
    pagesize: number,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetTimestampsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetTimestamps({ skip, pagesize: queryPageSize });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const items = res.timestampSets.map((t) => t.id);
    return { items };
  }

  async getTimestamp(
    timestampIdEncoded: string,
  ): Promise<TimestampResponseObject> {
    let res: GetTimestampQuery;
    let resHashAlgo: GetHashAlgorithmQuery;
    try {
      const timestampId = `0x${Buffer.from(
        multihashDecode(multibase.base64url.decode(timestampIdEncoded)),
      ).toString("hex")}`;

      res = await sdk.GetTimestamp({ timestampId });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.timestampSet) {
      throw new NotFoundError("Timestamp Not Found", {
        detail: `Timestamp ${timestampIdEncoded} not found`,
      });
    }

    try {
      resHashAlgo = await sdk.GetHashAlgorithm({
        hashAlgorithmId: res.timestampSet.hashAlgorithmId,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!resHashAlgo.hashAlgo) {
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: `Hash algorithm ${res.timestampSet.hashAlgorithmId} not found`,
      });
    }

    const { hashValue, creator, blockNumber, timestampData, transactionHash } =
      res.timestampSet;

    // Multi-hash (multibase base64url)
    const multihashEncodedHash = multibase.base64.encode(
      multihashEncode(
        hashValue,
        resHashAlgo.hashAlgo.multiHash as HashName,
        Number(resHashAlgo.hashAlgo.outputLength) / 8,
      ),
    );

    return {
      hash: multihashEncodedHash,
      timestampedBy: creator,
      blockNumber: Number(blockNumber),
      timestamp: new Date(
        Number(res.timestampSet.timestamp) * 1000,
      ).toISOString(),
      data: timestampData,
      transactionHash,
    };
  }
}
