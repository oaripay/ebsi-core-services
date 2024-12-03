import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { Timestamp } from "@ebsiint-sc/timestamp";
import { Injectable, Logger } from "@nestjs/common";

import { LedgerService } from "../ledger/ledger.service.js";
import { HashAlgorithmResponseObject } from "./hash-algorithms.interface.js";

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getHashAlgorithm(
    hashAlgorithmId: string,
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: Awaited<ReturnType<Timestamp["getHashAlgorithmById"]>>;

    try {
      hashAlgorithm = await this.ledgerService
        .getContract()
        .getHashAlgorithmById(hashAlgorithmId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
      });
    }

    const { ianaName, multiHash, oid, outputLength, status } = hashAlgorithm;

    return {
      ianaName,
      multihash: multiHash,
      oid,
      outputLengthBits: outputLength.toNumber(),
      // 1: active - 2: revoked
      status: status === 1 ? "active" : "revoked",
    };
  }

  async getHashAlgorithms(
    page: number,
    pageSize: number,
  ): Promise<ReturnType<Timestamp["getHashAlgorithms"]>> {
    try {
      return await this.ledgerService
        .getContract()
        .getHashAlgorithms(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Failed to get hash algorithms", {
        detail: "Failed to get hash algorithms",
      });
    }
  }
}

export default HashAlgorithmsService;
