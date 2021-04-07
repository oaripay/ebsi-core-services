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

  async getIdentifiersVersions(
    did: string,
    page: number,
    pageSize: number,
    validAt?: string
  ): ReturnType<DidRegistry["getDidDocumentVersionIds"]> {
    if (validAt) {
      // TODO: filter for a specific date-time and find the did document version ID valide at that time.
    }

    const hexDid = `0x${Buffer.from(did).toString("hex")}`;

    return this.didRegistryContract.getDidDocumentVersionIds(
      hexDid,
      page,
      pageSize
    );
  }

  async getIdentifierVersion(
    did: string,
    versionId: string
  ): Promise<{ [x: string]: unknown }> {
    try {
      const hexDid = `0x${Buffer.from(did).toString("hex")}`;
      await this.didRegistryContract.getLatestDidDocumentVersion(hexDid);
    } catch (e) {
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }

    try {
      const latesteDidDoc = await this.didRegistryContract.getDidDocumentVersionInfo(
        versionId
      );
      return JSON.parse(
        Buffer.from(remove0xPrefix(latesteDidDoc), "hex").toString()
      ) as { [x: string]: unknown };
    } catch (e) {
      throw new NotFoundError("Version Not Found", {
        detail: `Version ${versionId} not found`,
      });
    }
  }
}
