import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, isEthersError } from "@ebsiint-api/shared";
import type { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import { LedgerService } from "../ledger/ledger.service.js";
import type { Document } from "./documents.interface.js";

@Injectable()
export default class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getDocuments(
    page: number,
    pageSize: number,
  ): ReturnType<TrackAndTrace["getDocuments"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getDocuments(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("No documents found", {
        detail: "No documents found",
      });
    }
  }

  async getDocument(documentId: string): Promise<Document> {
    let document: Awaited<ReturnType<TrackAndTrace["getDocument"]>>;

    try {
      document = await (
        await this.ledgerService.getContract()
      ).getDocument(documentId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    const documentTimestamp =
      document.documentTimestamp.timestamp.toHexString();

    if (document.creator === "" && documentTimestamp === "0x00") {
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    const doc = {
      metadata: document.documentMetadata,
      timestamp: {
        datetime: documentTimestamp,
        source: document.documentTimestamp.source === 0 ? "block" : "external",
        proof: document.documentTimestamp.proof,
      },
      events: document.eventHashes,
      creator: document.creator,
    } satisfies Document;

    return doc;
  }
}
