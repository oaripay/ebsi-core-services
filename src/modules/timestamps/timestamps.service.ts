import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import multihash from "multihashes";
import LedgerService from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "../../contracts/timestamp";
import { TimestampResponseObject } from "./timestamps.interface";
import { multibase64Decode, multihashEncode } from "../../shared/utils";

@Injectable()
export default class TimestampsService {
  private readonly logger = new Logger(TimestampsService.name);

  private timestampContract: Timestamp;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.timestampContract = this.ledgerService.getContract();
  }

  async getTimestamps(
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getTimestamps"]> {
    return this.timestampContract.getTimestamps(page, pageSize);
  }

  async getTimestamp(timestampId: string): Promise<TimestampResponseObject> {
    let timestamp: AsyncReturnType<Timestamp["getTimestamp"]>;
    try {
      const timestampIdDecoded = multibase64Decode(timestampId);
      timestamp = await this.timestampContract.getTimestampById(
        timestampIdDecoded
      );
    } catch (error) {
      this.logger.error((error as Error).message, (error as Error).stack);
      throw new NotFoundError("Timestamp Not Found", {
        detail: `Timestamp ${timestampId} not found`,
      });
    }

    const { hash, timestampedBy, blockNumber, data } = timestamp;

    // Parallelize SC calls
    const [hashAlgorithm, block] = await Promise.all([
      this.timestampContract.getHashAlgorithmById(hash.algorithm.toNumber()),
      this.timestampContract.provider.getBlock(blockNumber.toNumber()),
    ]);

    // check if ianaName is valid, otherwise fallback to "sha2-256" as a temporary fix
    let { ianaName } = hashAlgorithm as { ianaName: multihash.HashName };
    try {
      multihash.coerceCode(ianaName);
    } catch (e) {
      this.logger.error(
        `Tried to use ianaName "${ianaName}", falling back to sha2-256`
      );
      ianaName = "sha2-256";
    }

    // multi-hash (base64 multi-encoded)
    const multihashEncodedHash = multihashEncode(hash.value, ianaName);

    return {
      hash: multihashEncodedHash,
      timestampedBy,
      blockNumber: blockNumber.toNumber(),
      data,
      transactionHash: block.transactions[0],
    };
  }
}
