import { graphql, HttpResponse } from "msw";
import { dummyData } from "./data.js";
import {
  Event_filter,
  Document_filter,
  Invitation_filter,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../.graphclient/index.js";

export const handlers = [
  graphql.query("GetDocuments", ({ variables }) => {
    const { skip, pagesize, where } = variables as {
      skip: number;
      pagesize: number;
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
          document: null,
        },
      });
    }
    const {
      creator,
      timestamp,
      source,
      proof,
      metadata,
      events: ev,
    } = document;
    const events = ev.map((e) => {
      const { id } = e;
      return { id };
    });
    return HttpResponse.json({
      data: {
        document: { creator, timestamp, source, proof, metadata, events },
      },
    });
  }),

  graphql.query("GetDocumentEvents", ({ variables }) => {
    const { documentId, skip, pagesize, where } = variables as {
      documentId: string;
      skip: number;
      pagesize: number;
      where: Event_filter;
    };
    const document = dummyData.documents.find((h) => h.id === documentId);
    if (!document) {
      return HttpResponse.json({
        data: {
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
      sender,
      hash,
      externalHash,
      timestamp,
      source,
      proof,
      metadata,
      origin,
    } = event;
    return HttpResponse.json({
      data: {
        document: {
          events: [
            {
              sender,
              hash,
              externalHash,
              timestamp,
              source,
              proof,
              metadata,
              origin,
            },
          ],
        },
      },
    });
  }),

  graphql.query("GetDocumentInvitations", ({ variables }) => {
    const { documentId, skip, pagesize, where } = variables as {
      documentId: string;
      skip: number;
      pagesize: number;
      where: Invitation_filter;
    };
    const document = dummyData.documents.find((h) => h.id === documentId);
    if (!document) {
      return HttpResponse.json({
        data: {
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
        const { subject, grantedBy, type } = i;
        return { subject, grantedBy, type };
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
    const { subject, skip, pagesize, where } = variables as {
      subject: string;
      skip: number;
      pagesize: number;
      where: Invitation_filter;
    };
    const operator = dummyData.operators.find((h) => h.id === subject);
    if (!operator) {
      return HttpResponse.json({
        data: {
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
        const { subject: sub, grantedBy, type, document } = i;
        return { subject: sub, grantedBy, type, document: { id: document.id } };
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
