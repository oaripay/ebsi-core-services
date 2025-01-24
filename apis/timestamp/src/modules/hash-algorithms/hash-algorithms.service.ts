import type { Timestamp } from "@ebsiint-sc/timestamp";

import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { Timestamp__factory } from "@ebsiint-sc/timestamp";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type { HashAlgorithmResponseObject } from "./hash-algorithms.interface.js";

import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export class HashAlgorithmsService {
  private readonly contract: Timestamp;

  private readonly logger = new Logger(HashAlgorithmsService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    const contractAddress = configService.get("contractAddr", {
      infer: true,
    });
    this.contract = Timestamp__factory.connect(contractAddress);
  }

  async getHashAlgorithm(
    hashAlgorithmId: string,
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: Awaited<ReturnType<Timestamp["getHashAlgorithmById"]>>;

    const provider = this.ledgerService.getProvider();

    try {
      hashAlgorithm = await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
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
      outputLengthBits: Number(outputLength),
      // 1: active - 2: revoked
      status: status === 1n ? "active" : "revoked",
    };
  }

  async getHashAlgorithms(
    page: number,
    pageSize: number,
  ): Promise<ReturnType<Timestamp["getHashAlgorithms"]>> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
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
