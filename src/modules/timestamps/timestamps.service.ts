import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  InternalServerError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { LedgerService } from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "../../contracts/timestamp";
import { TimestampResponseObject } from "./timestamps.interface";
import {
  IanaName,
  multibase64Decode,
  multihashEncode,
  isSupportedIanaName,
  ianaNameToMultihashName,
} from "../../shared/utils";

@Injectable()
export default class TimestampsService {
  private readonly logger = new Logger(TimestampsService.name);

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {}

  async getTimestamps(
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getTimestamps"]> {
    return (await this.ledgerService.getContract()).getTimestamps(
      page,
      pageSize
    );
  }

  async getTimestamp(timestampId: string): Promise<TimestampResponseObject> {
    let timestamp: AsyncReturnType<Timestamp["getTimestamp"]>;
    try {
      const timestampIdDecoded = multibase64Decode(timestampId);
      timestamp = await (
        await this.ledgerService.getContract()
      ).getTimestampById(timestampIdDecoded);
    } catch (error) {
      this.logger.error((error as Error).message, (error as Error).stack);
      throw new NotFoundError("Timestamp Not Found", {
        detail: `Timestamp ${timestampId} not found`,
      });
    }

    const { hash, timestampedBy, blockNumber, data } = timestamp;

    // Parallelize SC calls
    const [hashAlgorithm, block] = await Promise.all([
      (
        await this.ledgerService.getContract()
      ).getHashAlgorithmById(hash.algorithm.toNumber()),
      (
        await this.ledgerService.getContract()
      ).provider.getBlock(blockNumber.toNumber()),
    ]);

    const ianaName = hashAlgorithm.ianaName.toLowerCase();

    // Check if ianaName is valid
    if (!isSupportedIanaName(ianaName)) {
      this.logger.error(`Unsupported IANA name: ${hashAlgorithm.ianaName}`);
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Unsupported hash algorithm",
      });
    }

    // Multi-hash (base64 multi-encoded)
    const multihashEncodedHash = multihashEncode(
      hash.value,
      ianaNameToMultihashName(ianaName as IanaName)
    );

    return {
      hash: multihashEncodedHash,
      timestampedBy,
      blockNumber: blockNumber.toNumber(),
      data,
      transactionHash: block.transactions[0],
    };
  }
}
