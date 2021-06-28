import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ethers } from "ethers";
import { LedgerService } from "../ledger/ledger.service";
import { DidRegistry } from "../../contracts/did-registry";
import { remove0xPrefix } from "../../shared/utils";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIdentifiers(
    page: number,
    pageSize: number,
    controllerId?: string
  ): ReturnType<DidRegistry["getDidRecordIdentifiers"]> {
    if (controllerId) {
      return (
        await this.ledgerService.getContract()
      ).getDidRecordIdentifiersByControllerId(controllerId, page, pageSize);
    }

    return (await this.ledgerService.getContract()).getDidRecordIdentifiers(
      page,
      pageSize
    );
  }

  private async retrieveIdentifier(
    hexIdentifier: string
  ): Promise<{ [x: string]: unknown }> {
    const latesteDidDoc = await (
      await this.ledgerService.getContract()
    ).getLatestDidDocumentVersion(hexIdentifier);
    return JSON.parse(
      Buffer.from(remove0xPrefix(latesteDidDoc), "hex").toString()
    ) as { [x: string]: unknown };
  }

  async getIdentifier(did: string): Promise<{ [x: string]: unknown }> {
    try {
      const hexDid = `0x${Buffer.from(did.toLowerCase()).toString("hex")}`;
      return await this.retrieveIdentifier(hexDid);
    } catch (e) {
      // Try to retrieve the original DID
      if (did !== did.toLowerCase()) {
        try {
          const hexOriginalDid = `0x${Buffer.from(did).toString("hex")}`;
          return await this.retrieveIdentifier(hexOriginalDid);
        } catch (err) {
          throw new NotFoundError("Identifier Not Found", {
            detail: `Identifier ${did} not found`,
          });
        }
      }

      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }
  }

  private async retrieveIdentifiersVersions(
    hexDid: string,
    page: number,
    pageSize: number
  ) {
    return (await this.ledgerService.getContract()).getDidDocumentVersionIds(
      hexDid,
      page,
      pageSize
    );
  }

  async getIdentifiersVersions(
    did: string,
    page: number,
    pageSize: number,
    validAt?: string
  ): ReturnType<DidRegistry["getDidDocumentVersionIds"]> {
    if (validAt) {
      // TODO: filter for a specific date-time and find the did document version ID valide at that time.
      // https://ec.europa.eu/cefdigital/tracker/browse/EBSIINT-2932
    }

    try {
      const hexLowercaseDid = `0x${Buffer.from(did.toLowerCase()).toString(
        "hex"
      )}`;
      return await this.retrieveIdentifiersVersions(
        hexLowercaseDid,
        page,
        pageSize
      );
    } catch (e) {
      // Try to retrieve the requested DID's versions
      if (did !== did.toLowerCase()) {
        try {
          const hexOriginalDid = `0x${Buffer.from(did).toString("hex")}`;
          return this.retrieveIdentifiersVersions(
            hexOriginalDid,
            page,
            pageSize
          );
        } catch (err) {
          throw new NotFoundError("Identifier Not Found", {
            detail: `Identifier ${did} not found`,
          });
        }
      }

      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }
  }

  async getIdentifierVersion(
    did: string,
    versionId: string
  ): Promise<{ [x: string]: unknown }> {
    // Make sure the DID exists
    await this.getIdentifier(did);

    try {
      const versionInfo = await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionInfo(versionId);
      return JSON.parse(
        Buffer.from(remove0xPrefix(versionInfo), "hex").toString()
      ) as { [x: string]: unknown };
    } catch (e) {
      throw new NotFoundError("Version Not Found", {
        detail: `Version ${versionId} not found`,
      });
    }
  }

  async getIdentifiersVersionsMetadata(
    did: string,
    versionId: string,
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getDidDocumentVersionMetadataIds"]> {
    const hexDid = `0x${Buffer.from(did.toLowerCase()).toString("hex")}`;

    try {
      return await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionMetadataIds(hexDid, versionId, page, pageSize);
    } catch (e) {
      // TODO: remove the require in the smart contract
      // (function getDidDocumentVersionMetadataIds)
      return {
        items: [],
        total: ethers.BigNumber.from(0),
        howMany: ethers.BigNumber.from(pageSize),
        prev: ethers.BigNumber.from(1),
        next: ethers.BigNumber.from(1),
      } as unknown as ReturnType<
        DidRegistry["getDidDocumentVersionMetadataIds"]
      >;
    }
  }

  async getIdentifierVersionMetadata(
    did: string,
    versionId: string,
    metadataId: string
  ): Promise<{ [x: string]: unknown }> {
    // Make sure the DID exists
    await this.getIdentifier(did);

    try {
      const versionInfo = await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionInfo(versionId);
      if (versionInfo === "0x") throw new Error();
    } catch (e) {
      throw new NotFoundError("Version Not Found", {
        detail: `Version ${versionId} not found`,
      });
    }

    try {
      const metadata = await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionMetadata(metadataId);

      return JSON.parse(
        Buffer.from(remove0xPrefix(metadata), "hex").toString()
      ) as { [x: string]: unknown };
    } catch (e) {
      throw new NotFoundError("Metadata Not Found", {
        detail: `Metadata ${metadataId} not found`,
      });
    }
  }
}
