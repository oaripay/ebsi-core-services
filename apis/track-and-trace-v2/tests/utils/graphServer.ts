import { graphql, HttpResponse } from "msw";

import type {
  Document_filter,
  Event_filter,
  Invitation_filter,
} from "../../.graphclient/index.js";

import { dummyData } from "./data.js";

export const handlers = [
  graphql.query("GetDocuments", ({ variables }) => {
    const { pagesize, skip, where } = variables as {
      pagesize: number;
      skip: number;
      where: Document_filter;
    };
    return HttpResponse.json({
      data: {
        documents: dummyData.documents
          .filter((d) => {
            if (
              where &&
              ((where.creator && d.creator !== where.creator) ||
                (where.source && d.source !== where.source))
            )
              return false;
            return true;
          })
          .slice(skip, skip + pagesize)
          .map((i) => ({ id: i.id })),
      },
    });
  }),

  graphql.query("GetDocument", ({ variables }) => {
    const { documentId } = variables as { documentId: string };
    const document = dummyData.documents.find((h) => h.id === documentId);
    if (!document) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          document: null,
        },
      });
    }
    const {
      creator,
      events: ev,
      metadata,
      proof,
      source,
      timestamp,
    } = document;
    const events = ev.map((e) => {
      const { id } = e;
      return { id };
    });
    return HttpResponse.json({
      data: {
        document: { creator, events, metadata, proof, source, timestamp },
      },
    });
  }),

  graphql.query("GetDocumentEvents", ({ variables }) => {
    const { documentId, pagesize, skip, where } = variables as {
      documentId: string;
      pagesize: number;
      skip: number;
      where: Event_filter;
    };
    const document = dummyData.documents.find((h) => h.id === documentId);
    if (!document) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          document: null,
        },
      });
    }
    const { events: ev } = document;
    const events = ev
      .filter((e) => {
        if (
          where &&
          ((where.externalHash && e.externalHash !== where.externalHash) ||
            (where.origin && e.origin !== where.origin) ||
            (where.sender && e.sender !== where.sender) ||
            (where.source && e.source !== where.source))
        )
          return false;
        return true;
      })
      .slice(skip, skip + pagesize)
      .map((e) => ({ id: e.id }));
    return HttpResponse.json({
      data: {
        document: {
          events,
        },
      },
    });
  }),

  graphql.query("GetDocumentEvent", ({ variables }) => {
    const { documentId, eventId } = variables as {
      documentId: string;
      eventId: string;
    };
    const document = dummyData.documents.find((h) => h.id === documentId);
    if (!document) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          document: null,
        },
      });
    }
    const event = document.events.find((e) => e.id === eventId);
    if (!event) {
      return HttpResponse.json({
        data: {
          document: { events: [] },
        },
      });
    }
    const {
      externalHash,
      hash,
      metadata,
      origin,
      proof,
      sender,
      source,
      timestamp,
    } = event;
    return HttpResponse.json({
      data: {
        document: {
          events: [
            {
              externalHash,
              hash,
              metadata,
              origin,
              proof,
              sender,
              source,
              timestamp,
            },
          ],
        },
      },
    });
  }),

  graphql.query("GetDocumentInvitations", ({ variables }) => {
    const { documentId, pagesize, skip, where } = variables as {
      documentId: string;
      pagesize: number;
      skip: number;
      where: Invitation_filter;
    };
    const document = dummyData.documents.find((h) => h.id === documentId);
    if (!document) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          document: null,
        },
      });
    }
    const { creator, invitations: inv } = document;
    const invitations = inv
      .filter((i) => {
        if (
          where &&
          ((where.type && i.type !== where.type) ||
            (where.grantedBy && i.grantedBy !== where.grantedBy) ||
            (where.subject && i.subject !== where.subject))
        )
          return false;
        return true;
      })
      .slice(skip, skip + pagesize)
      .map((i) => {
        const { grantedBy, subject, type } = i;
        return { grantedBy, subject, type };
      });
    return HttpResponse.json({
      data: {
        document: {
          creator,
          invitations,
        },
      },
    });
  }),

  graphql.query("GetCreator", ({ variables }) => {
    const { did } = variables as { did: string };
    const creator = dummyData.creators.find((h) => h.id === did);
    if (!creator) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          creator: null,
        },
      });
    }
    const { active } = creator;
    return HttpResponse.json({
      data: {
        creator: {
          active,
        },
      },
    });
  }),

  graphql.query("GetOperator", ({ variables }) => {
    const { pagesize, skip, subject, where } = variables as {
      pagesize: number;
      skip: number;
      subject: string;
      where: Invitation_filter;
    };
    const operator = dummyData.operators.find((h) => h.id === subject);
    if (!operator) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          operator: null,
        },
      });
    }
    const { invitations: inv } = operator;
    const invitations = inv
      .filter((i) => {
        if (
          where &&
          ((where.type && i.type !== where.type) ||
            (where.grantedBy && i.grantedBy !== where.grantedBy))
        )
          return false;
        return true;
      })
      .slice(skip, skip + pagesize)
      .map((i) => {
        const { document, grantedBy, subject: sub, type } = i;
        return { document: { id: document.id }, grantedBy, subject: sub, type };
      });
    return HttpResponse.json({
      data: {
        operator: {
          invitations,
        },
      },
    });
  }),
];

export default handlers;
