import { Injectable, Logger } from "@nestjs/common";
import {
  InternalServerError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { HashName } from "multihashes";
import type { ethers } from "ethers";
import { LedgerService } from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "../../contracts/timestamp";
import { TimestampResponseObject } from "./timestamps.interface";
import {
  multibase,
  multihashEncode,
  multihashDecode,
} from "../../shared/utils";

@Injectable()
export default class TimestampsService {
  private readonly logger = new Logger(TimestampsService.name);

  constructor(private ledgerService: LedgerService) {}

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
      const timestampIdDecoded = `0x${Buffer.from(
        multihashDecode(multibase.base64url.decode(timestampId))
      ).toString("hex")}`;

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
      ).provider.getBlockWithTransactions(blockNumber.toNumber()),
    ]);

    // Multi-hash (multibase base64url)
    const { multiHash, outputLength } = hashAlgorithm;
    const multihashEncodedHash = multibase.base64.encode(
      multihashEncode(
        timestamp.hash.value,
        multiHash as HashName,
        outputLength.toNumber() / 8
      )
    );

    // Find correct tx hash
    let transactionHash = "";

    if (block.transactions.length === 0) {
      this.logger.error(
        `Timestamp ${timestampId} refers to an empty block: ${blockNumber.toNumber()}`
      );
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Invalid record",
      });
    }

    const { interface: contractInterface } =
      await this.ledgerService.getContract();

    // Find the transaction in the block that was sent with:
    // {
    //   hashAlgorithmIds: [..., hash.algorithm, ...],
    //   hashValues: [..., hash.value, ...],
    //   ...
    // }
    const transaction = block.transactions.find((tx) => {
      let parsedTx: ethers.utils.TransactionDescription;
      try {
        parsedTx = contractInterface.parseTransaction(tx);
      } catch (e) {
        return false;
      }

      if (
        !Array.isArray(parsedTx.args.hashAlgorithmIds) ||
        !Array.isArray(parsedTx.args.hashValues) ||
        parsedTx.args.hashAlgorithmIds.length === 0 ||
        parsedTx.args.hashValues.length === 0
      ) {
        return false;
      }

      return parsedTx.args.hashAlgorithmIds.some(
        (hashAlgId, index) =>
          // Compare hash algorithm ID
          hash.algorithm.eq(hashAlgId as ethers.BigNumberish) &&
          // Compare hash value
          index in parsedTx.args.hashValues &&
          (parsedTx.args.hashValues as string[])[index] === hash.value
      );
    });

    if (!transaction) {
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Unable to find the corresponding transaction",
      });
    }

    transactionHash = transaction.hash;

    return {
      hash: multihashEncodedHash,
      timestampedBy,
      blockNumber: blockNumber.toNumber(),
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      data,
      transactionHash,
    };
  }
}
