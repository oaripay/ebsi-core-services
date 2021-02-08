import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "../../contracts/timestamp";
import { HashAlgorithmResponseObject } from "./hash-algorithms.interface";

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  private timestampContract: Timestamp;

  constructor(private ledgerService: LedgerService) {
    this.timestampContract = this.ledgerService.getContract();
  }

  async getHashAlgorithms(
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getHashAlgorithms"]> {
    return this.timestampContract.getHashAlgorithms(page, pageSize);
  }

  async getHashAlgorithm(
    hashAlgorithmId: string
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: AsyncReturnType<Timestamp["getHashAlgorithmById"]>;

    try {
      hashAlgorithm = await this.timestampContract.getHashAlgorithmById(
        hashAlgorithmId
      );
    } catch (error) {
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
      });
    }

    const { outputLength, ianaName, oid, status } = hashAlgorithm;

    return {
      outputLengthBits: outputLength.toNumber(),
      ianaName,
      oid,
      // 1: active - 2: revoked
      status: status === 1 ? "active" : "revoked",
    };
  }
}

export default HashAlgorithmsService;
