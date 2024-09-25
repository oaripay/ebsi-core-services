import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, InternalServerError } from "@ebsiint-api/shared";
import type { Document, Event } from "./documents.interface.js";
import { hexToDid } from "../../shared/utils.js";

import {
  getBuiltGraphSDK,
  GetDocumentsQuery,
  GetDocumentQuery,
  GetDocumentEventsQuery,
  GetDocumentEventQuery,
  GetDocumentInvitationsQuery,
  Document_filter,
  Invitation_filter,
  Event_filter,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";
import Access from "../accesses/accesses.interface.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

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
      res = await sdk.GetDocuments({ skip, pagesize: queryPageSize, where });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const items = res.documents.map((d) => d.id);
    return { items };
  }

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
      metadata,
      timestamp,
      source,
      proof,
      events: ev,
      creator,
    } = res.document;
    const events = ev.map((e) => e.id);

    return {
      metadata,
      timestamp: {
        datetime: `0x${Number(timestamp).toString(16)}`,
        source,
        proof,
      },
      events,
      creator,
    } satisfies Document;
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
        skip,
        pagesize: queryPageSize,
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
      timestamp,
      source,
      proof,
      sender,
      origin,
      metadata,
    } = event!;

    return {
      externalHash,
      hash,
      timestamp: {
        datetime: `0x${Number(timestamp).toString(16)}`,
        source,
        proof,
      },
      sender: hexToDid(sender),
      origin,
      metadata,
    } satisfies Event;
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
        skip,
        pagesize: queryPageSize,
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
      const { subject, type: permission, grantedBy } = inv;
      return {
        subject: hexToDid(subject),
        permission,
        documentId,
        grantedBy: hexToDid(grantedBy),
      };
    });

    return { items };
  }
}
