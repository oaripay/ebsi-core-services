import { Injectable, Logger } from "@nestjs/common";
import { DidRegistry } from "@ebsiint-sc/did-registry";
import {
  remove0xPrefix,
  NotFoundError,
  isEthersError,
} from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIdentifiers(
    page: number,
    pageSize: number,
    controllerId?: string,
  ): ReturnType<DidRegistry["getDidRecordIdentifiers"]> {
    if (controllerId) {
      try {
        return await (
          await this.ledgerService.getContract()
        ).getDidRecordIdentifiersByControllerId(
          controllerId.toLowerCase(),
          page,
          pageSize,
        );
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new NotFoundError("Could not retreive identifiers", {
          detail: `Could not retreive identifiers by controller ID ${controllerId}`,
        });
      }
    }

    try {
      return await (
        await this.ledgerService.getContract()
      ).getDidRecordIdentifiers(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Could not retreive identifiers", {
        detail: "Could not retreive identifiers",
      });
    }
  }

  private async retrieveIdentifier(
    hexIdentifier: string,
  ): Promise<Record<string, unknown>> {
    try {
      const latesteDidDoc = await (
        await this.ledgerService.getContract()
      ).getLatestDidDocumentVersion(hexIdentifier);
      return JSON.parse(
        Buffer.from(remove0xPrefix(latesteDidDoc), "hex").toString(),
      ) as Record<string, unknown>;
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${hexIdentifier} not found`,
      });
    }
  }

  async getIdentifier(did: string): Promise<Record<string, unknown>> {
    try {
      const hexDid = `0x${Buffer.from(did).toString("hex")}`;
      return await this.retrieveIdentifier(hexDid);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }
  }

  private async retrieveIdentifiersVersions(
    hexDid: string,
    page: number,
    pageSize: number,
  ) {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionIds(hexDid, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${hexDid} not found`,
      });
    }
  }

  async getIdentifiersVersions(
    did: string,
    page: number,
    pageSize: number,
    validAt?: string,
  ): ReturnType<DidRegistry["getDidDocumentVersionIds"]> {
    if (validAt) {
      // TODO: filter for a specific date-time and find the did document version ID valide at that time.
      // https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-2932
    }

    try {
      const hexDid = `0x${Buffer.from(did).toString("hex")}`;
      return await this.retrieveIdentifiersVersions(hexDid, page, pageSize);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }
  }

  async getIdentifierVersion(
    did: string,
    versionId: string,
  ): Promise<Record<string, unknown>> {
    // Make sure the DID exists
    await this.getIdentifier(did);

    try {
      const versionInfo = await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionInfo(versionId);
      return JSON.parse(
        Buffer.from(remove0xPrefix(versionInfo), "hex").toString(),
      ) as Record<string, unknown>;
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Version Not Found", {
        detail: `Version ${versionId} not found`,
      });
    }
  }

  async getIdentifiersVersionsMetadata(
    did: string,
    versionId: string,
    page: number,
    pageSize: number,
  ): ReturnType<DidRegistry["getDidDocumentVersionMetadataIds"]> {
    // Make sure the DID and the Version ID exist
    await this.getIdentifierVersion(did, versionId);

    try {
      const hexDid = `0x${Buffer.from(did).toString("hex")}`;
      return await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionMetadataIds(hexDid, versionId, page, pageSize);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }
  }

  async getIdentifierVersionMetadata(
    did: string,
    versionId: string,
    metadataId: string,
  ): Promise<Record<string, unknown>> {
    // Make sure the DID and the Version ID exist
    await this.getIdentifierVersion(did, versionId);

    try {
      const metadata = await (
        await this.ledgerService.getContract()
      ).getDidDocumentVersionMetadata(metadataId);

      return JSON.parse(
        Buffer.from(remove0xPrefix(metadata), "hex").toString(),
      ) as Record<string, unknown>;
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Metadata Not Found", {
        detail: `Metadata ${metadataId} not found`,
      });
    }
  }
}
