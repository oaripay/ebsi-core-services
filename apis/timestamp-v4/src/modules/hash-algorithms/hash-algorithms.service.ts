import { Injectable, Logger } from "@nestjs/common";
import { Timestamp } from "@ebsiint-sc/timestamp-v2";
import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import { HashAlgorithmResponseObject } from "./hash-algorithms.interface.js";

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getHashAlgorithms(
    page: number,
    pageSize: number,
  ): Promise<ReturnType<Timestamp["getHashAlgorithms"]>> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getHashAlgorithms(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Failed to get hash algorithms", {
        detail: "Failed to get hash algorithms",
      });
    }
  }

  async getHashAlgorithm(
    hashAlgorithmId: number,
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: Awaited<ReturnType<Timestamp["getHashAlgorithmById"]>>;

    try {
      hashAlgorithm = await (
        await this.ledgerService.getContract()
      ).getHashAlgorithmById(hashAlgorithmId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
      });
    }

    const { outputLength, ianaName, oid, status, multiHash } = hashAlgorithm;

    return {
      outputLengthBits: outputLength.toNumber(),
      ianaName,
      oid,
      // 1: active - 2: revoked
      status: status === 1 ? "active" : "revoked",
      multihash: multiHash,
    };
  }
}

export default HashAlgorithmsService;
