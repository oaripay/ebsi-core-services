import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, isEthersError } from "@ebsiint-api/shared";
import type { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import { LedgerService } from "../ledger/ledger.service.js";
import type { Document, Event } from "./documents.interface.js";

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

    return {
      metadata: document.documentMetadata,
      timestamp: {
        datetime: document.documentTimestamp.timestamp.toHexString(),
        source: document.documentTimestamp.source === 0 ? "block" : "external",
        proof: document.documentTimestamp.proof,
      },
      events: document.eventHashes,
      creator: document.creator,
    } satisfies Document;
  }

  async getDocumentEvents(
    documentId: string,
    page: number,
    pageSize: number,
  ): ReturnType<TrackAndTrace["getEvents"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getEvents(documentId, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }
  }

  async getDocumentEvent(documentId: string, eventId: string): Promise<Event> {
    let event: Awaited<ReturnType<TrackAndTrace["getEvent"]>>;

    try {
      event = await (
        await this.ledgerService.getContract()
      ).getEvent(documentId, eventId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }

      if (
        error instanceof Error &&
        error.message.includes("Document does not exist")
      ) {
        throw new NotFoundError("Document Not Found", {
          detail: `Document ${documentId} not found`,
        });
      }

      throw new NotFoundError("Event Not Found", {
        detail: `Event ${eventId} not found`,
      });
    }

    return {
      externalHash: event.externalHash,
      hash: event.hash,
      timestamp: {
        datetime: event.eventTimestamp.timestamp.toHexString(),
        source: event.eventTimestamp.source === 0 ? "block" : "external",
        proof: event.eventTimestamp.proof,
      },
      sender: event.sender,
      origin: event.origin,
      metadata: event.eventMetadata,
    } satisfies Event;
  }
}
