import { InternalServerError, NotFoundError } from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";

import type { Access } from "../accesses/accesses.interface.js";
import type { Document, Event } from "./documents.interface.js";

import {
  Document_filter,
  Event_filter,
  getBuiltGraphSDK,
  GetDocumentEventQuery,
  GetDocumentEventsQuery,
  GetDocumentInvitationsQuery,
  GetDocumentQuery,
  GetDocumentsQuery,
  Invitation_filter,
} from "../../../.graphclient/index.js";
import { hexToDid } from "../../shared/utils.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  async getDocument(documentId: string): Promise<Document> {
    let res: GetDocumentQuery;
    try {
      res = await sdk.GetDocument({ documentId });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.document) {
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    const {
      creator,
      events: ev,
      metadata,
      proof,
      source,
      timestamp,
    } = res.document;
    const events = ev.map((e) => e.id);

    return {
      creator,
      events,
      metadata,
      timestamp: {
        datetime: `0x${Number(timestamp).toString(16)}`,
        proof,
        source,
      },
    } satisfies Document;
  }

  async getDocumentAccesses(
    documentId: string,
    page: number,
    pagesize: number,
    where: Invitation_filter,
  ): Promise<{ items: Access[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetDocumentInvitationsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetDocumentInvitations({
        documentId,
        pagesize: queryPageSize,
        skip,
        where,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.document) {
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    const items = res.document.invitations.map((inv) => {
      const { grantedBy, subject, type: permission } = inv;
      return {
        documentId,
        grantedBy: hexToDid(grantedBy),
        permission,
        subject: hexToDid(subject),
      };
    });

    return { items };
  }

  async getDocumentEvent(documentId: string, eventId: string): Promise<Event> {
    let res: GetDocumentEventQuery;

    try {
      res = await sdk.GetDocumentEvent({ documentId, eventId });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.document) {
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    if (!res.document.events || res.document.events.length === 0) {
      throw new NotFoundError("Event Not Found", {
        detail: `Event ${eventId} not found`,
      });
    }

    const [event] = res.document.events;
    const {
      externalHash,
      hash,
      metadata,
      origin,
      proof,
      sender,
      source,
      timestamp,
    } = event!;

    return {
      externalHash,
      hash,
      metadata,
      origin,
      sender: hexToDid(sender),
      timestamp: {
        datetime: `0x${Number(timestamp).toString(16)}`,
        proof,
        source,
      },
    } satisfies Event;
  }

  async getDocumentEvents(
    documentId: string,
    page: number,
    pagesize: number,
    where: Event_filter,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetDocumentEventsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetDocumentEvents({
        documentId,
        pagesize: queryPageSize,
        skip,
        where,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.document) {
      throw new NotFoundError("Document Not Found", {
        detail: `Document ${documentId} not found`,
      });
    }

    const items = res.document.events.map((e) => e.id);
    return { items };
  }

  async getDocuments(
    page: number,
    pagesize: number,
    where: Document_filter = {},
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetDocumentsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetDocuments({ pagesize: queryPageSize, skip, where });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.documents) return { items: [] };

    const items = res.documents.map((d) => d.id);
    return { items };
  }
}
