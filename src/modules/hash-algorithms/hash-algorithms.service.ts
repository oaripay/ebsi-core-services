import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { DidRegistry } from "../../contracts/did-registry";
import { HashAlgorithmResponseObject } from "./hash-algorithms.interface";

@Injectable()
export class HashAlgorithmsService {
  private readonly logger = new Logger(HashAlgorithmsService.name);

  private didRegistryContract: DidRegistry;

  constructor(private contractService: ContractService) {
    this.didRegistryContract = this.contractService.getContract();
  }

  async getHashAlgorithms(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getHashAlgorithms"]> {
    return this.didRegistryContract.getHashAlgorithms(page, pageSize);
  }

  async getHashAlgorithm(
    hashAlgorithmId: string
  ): Promise<HashAlgorithmResponseObject> {
    let hashAlgorithm: AsyncReturnType<DidRegistry["getHashAlgorithmById"]>;

    try {
      hashAlgorithm = await this.didRegistryContract.getHashAlgorithmById(
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
