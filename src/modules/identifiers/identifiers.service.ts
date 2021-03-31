import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { DidRegistry } from "../../contracts/did-registry";
import { remove0xPrefix } from "../../shared/utils";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  private didRegistryContract: DidRegistry;

  constructor(private contractService: ContractService) {
    this.didRegistryContract = this.contractService.getContract();
  }

  async getIdentifiers(
    page: number,
    pageSize: number,
    controllerId?: string
  ): ReturnType<DidRegistry["getDidRecordIdentifiers"]> {
    if (controllerId) {
      return this.didRegistryContract.getDidRecordIdentifiersByControllerId(
        controllerId,
        page,
        pageSize
      );
    }

    return this.didRegistryContract.getDidRecordIdentifiers(page, pageSize);
  }

  async getIdentifier(did: string): Promise<{ [x: string]: unknown }> {
    try {
      const hexDid = `0x${Buffer.from(did).toString("hex")}`;
      const latesteDidDoc = await this.didRegistryContract.getLatestDidDocumentVersion(
        hexDid
      );
      return JSON.parse(
        Buffer.from(remove0xPrefix(latesteDidDoc), "hex").toString()
      ) as { [x: string]: unknown };
    } catch (e) {
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }
  }
}
