import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { coerceCode, HashName } from "multihashes";
import { DidTimestampResponseObject } from "./did-timestamps.interface";
import { ContractService } from "../../shared/services/contract.service";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { multihashEncode } from "../../shared/utils";

@Injectable()
export class DidTimestampsService {
  private readonly logger = new Logger(DidTimestampsService.name);

  private didRegistryContract: DidRegistry;

  constructor(private contractService: ContractService) {
    this.didRegistryContract = this.contractService.getContract();
  }

  async getDidTimestamps(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getDidTimestamps"]> {
    return this.didRegistryContract.getDidTimestamps(page, pageSize);
  }

  async getDidTimestamp(
    timestampId: string
  ): Promise<DidTimestampResponseObject> {
    let timestamp: AsyncReturnType<DidRegistry["getDidTimestampById"]>;

    try {
      timestamp = await this.didRegistryContract.getDidTimestampById(
        timestampId
      );
    } catch (e) {
      throw new NotFoundError("Timestamp Not Found", {
        detail: `Timestamp ${timestampId} not found`,
      });
    }

    const hashAlg = await this.didRegistryContract.getHashAlgorithmById(
      timestamp.hash.algorithm
    );

    let alg = hashAlg.ianaName as HashName;

    try {
      coerceCode(alg);
    } catch (e) {
      // If alg ianaName is not recognized, we fall back to sha2-256
      // TODO: improve handling of ianaName / we must validate ianaName as input in the jsonrpc module
      alg = "sha2-256";
    }

    return {
      hash: multihashEncode(timestamp.hash.value, alg),
      timestampedBy: timestamp.timestampedBy,
      blockNumber: timestamp.blockNumber.toNumber(),
      data: timestamp.data,
    };
  }
}

export default DidTimestampsService;
