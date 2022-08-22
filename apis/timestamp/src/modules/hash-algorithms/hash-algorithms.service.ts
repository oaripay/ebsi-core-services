import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { LedgerService } from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "@ebsiint-sc/timestamp";
import { HashAlgorithmResponseObject } from "./hash-algorithms.interface";

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getHashAlgorithms(
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getHashAlgorithms"]> {
    return (await this.ledgerService.getContract()).getHashAlgorithms(
      page,
      pageSize
    );
  }

  async getHashAlgorithm(
    hashAlgorithmId: string
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: AsyncReturnType<Timestamp["getHashAlgorithmById"]>;

    try {
      hashAlgorithm = await (
        await this.ledgerService.getContract()
      ).getHashAlgorithmById(hashAlgorithmId);
    } catch (error) {
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
