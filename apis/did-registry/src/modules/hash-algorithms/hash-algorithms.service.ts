import { Injectable, Logger } from "@nestjs/common";
import { DidRegistry } from "@ebsiint-sc/did-registry";
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
  ): Promise<ReturnType<DidRegistry["getHashAlgorithms"]>> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getHashAlgorithms(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: "Hash algorithm Not Found",
      });
    }
  }

  async getHashAlgorithm(
    hashAlgorithmId: string,
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: Awaited<ReturnType<DidRegistry["getHashAlgorithmById"]>>;

    try {
      hashAlgorithm = await (
        await this.ledgerService.getContract()
      ).getHashAlgorithmById(hashAlgorithmId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Hash algorithm Not Found", {
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
      });
    }

    const { outputLength, ianaName, oid, status, multihash } = hashAlgorithm;

    return {
      outputLengthBits: outputLength.toNumber(),
      ianaName,
      oid,
      // 1: active - 2: revoked
      status: status === 1 ? "active" : "revoked",
      multihash,
    };
  }
}

export default HashAlgorithmsService;
