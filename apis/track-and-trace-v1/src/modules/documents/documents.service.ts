import type { TrackAndTrace } from "@ebsiint-sc/track-and-trace";

import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";

import type {
  Document,
  DocumentAccesses,
  Event,
} from "./documents.interface.js";

import { Permission } from "../../shared/constants.js";
import { hexToDid, permissionToString } from "../../shared/utils.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export default class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getDocument(documentId: string): Promise<Document> {
    let document: Awaited<ReturnType<TrackAndTrace["getDocument"]>>;

    try {
      document = await this.ledgerService.getContract().getDocument(documentId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    return {
      creator: document.creator,
      events: document.eventHashes,
      metadata: document.documentMetadata,
      timestamp: {
        datetime: `0x${document.documentTimestamp.timestamp.toString(16)}`,
        proof: document.documentTimestamp.proof,
        source: document.documentTimestamp.source === 0n ? "block" : "external",
      },
    } satisfies Document;
  }

  async getDocumentAccesses(documentId: string): Promise<DocumentAccesses> {
    const pageSize = 50;
    let currentPage = 1;
    const documentAccesses: DocumentAccesses = [];

    let invitedUsers: Awaited<
      ReturnType<TrackAndTrace["getAccessesByDocument"]>
    >;

    do {
      try {
        invitedUsers = await this.ledgerService
          .getContract()
          .getAccessesByDocument(documentId, currentPage, pageSize);
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new NotFoundError("Document Not Found", {
          detail: `Document ${documentId} not found`,
        });
      }

      const fetchedDocumentAccesses = await Promise.all(
        invitedUsers.items.map(async (did) => {
          const [grantedByAccounts, , access] = await this.ledgerService
            .getContract()
            .getGrantedBy(documentId, did, [
              Permission.DELEGATE,
              Permission.WRITE,
              Permission.CREATOR,
            ]);

          const accesses: DocumentAccesses = [];

          for (const [
            permission,
            grantedByAccount,
          ] of grantedByAccounts.entries()) {
            if (!grantedByAccount || grantedByAccount === "0x") continue;
            if (!access[permission]) continue;

            accesses.push({
              documentId,
              grantedBy: hexToDid(grantedByAccount),
              permission: permissionToString(permission),
              subject: hexToDid(did),
            });
          }

          return accesses;
        }),
      );

      documentAccesses.push(...fetchedDocumentAccesses.flat());

      currentPage += 1;
    } while (Number(invitedUsers.total) > (currentPage - 1) * pageSize);

    return documentAccesses;
  }

  async getDocumentEvent(documentId: string, eventId: string): Promise<Event> {
    let event;
    try {
      event = await this.ledgerService.getContract().getFunction("getEvent")(
        documentId,
        eventId,
      );
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
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
      metadata: event.eventMetadata,
      origin: event.origin,
      sender: hexToDid(event.sender),
      timestamp: {
        datetime: `0x${event.eventTimestamp.timestamp.toString(16)}`,
        proof: event.eventTimestamp.proof,
        source: event.eventTimestamp.source === 0n ? "block" : "external",
      },
    } satisfies Event;
  }

  async getDocumentEvents(
    documentId: string,
    page: number,
    pageSize: number,
  ): ReturnType<TrackAndTrace["getEvents"]> {
    try {
      return await this.ledgerService
        .getContract()
        .getEvents(documentId, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }
  }

  async getDocuments(
    page: number,
    pageSize: number,
  ): ReturnType<TrackAndTrace["getDocuments"]> {
    try {
      return await this.ledgerService
        .getContract()
        .getDocuments(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("No documents found", {
        detail: "No documents found",
      });
    }
  }
}
