import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { Revision_filter, Schema_filter } from "../../.graphclient/index.js";
import { dummySchemas } from "./data.js";

export const graphServer = setupServer(
  graphql.query("GetSchemas", ({ variables }) => {
    const { pagesize, skip, where } = variables as {
      pagesize: number;
      skip: number;
      where: Schema_filter;
    };
    return HttpResponse.json({
      data: {
        schemas: dummySchemas
          .filter((s) => {
            if (
              where?.revisions_?.id &&
              !s.revisions.some((r) => r.id === where.revisions_!.id)
            )
              return false;
            return true;
          })
          .slice(skip, skip + pagesize)
          .map((s) => ({ id: s.id })),
      },
    });
  }),

  graphql.query("GetSchema", ({ variables }) => {
    const { schemaId } = variables as { schemaId: string };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          lastRevision: {
            content: schema.lastRevision.content,
          },
        },
      },
    });
  }),

  graphql.query("GetRevisions", ({ variables }) => {
    const { pagesize, schemaId, skip, where } = variables as {
      pagesize: number;
      schemaId: string;
      skip: number;
      where: Revision_filter;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => {
              if (
                where?.metadata_ &&
                !r.metadata.some((m) => m.id === where.metadata_!.id)
              )
                return false;
              return true;
            })
            .slice(skip, skip + pagesize)
            .map((r) => ({ id: r.id })),
        },
      },
    });
  }),

  graphql.query("GetAllRevisionsWithMetadata", ({ variables }) => {
    const { schemaId, where } = variables as {
      schemaId: string;
      where: Revision_filter;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => {
              if (
                where?.metadata_ &&
                !r.metadata.some((m) => m.id === where.metadata_!.id)
              )
                return false;
              return true;
            })
            .map((r) => ({
              id: r.id,
              metadata: r.metadata.map((m) => ({ content: m.content })),
            })),
        },
      },
    });
  }),

  graphql.query("GetRevision", ({ variables }) => {
    const { revisionId, schemaId } = variables as {
      revisionId: string;
      schemaId: string;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => r.id === revisionId)
            .map((r) => ({ content: r.content })),
        },
      },
    });
  }),

  graphql.query("GetMetadatas", ({ variables }) => {
    const { pagesize, revisionId, schemaId, skip } = variables as {
      pagesize: number;
      revisionId: string;
      schemaId: string;
      skip: number;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => r.id === revisionId)
            .map((r) => ({
              metadata: r.metadata
                .slice(skip, skip + pagesize)
                .map((m) => ({ id: m.id })),
            })),
        },
      },
    });
  }),

  graphql.query("GetMetadata", ({ variables }) => {
    const { metadataId, revisionId, schemaId } = variables as {
      metadataId: string;
      revisionId: string;
      schemaId: string;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => r.id === revisionId)
            .map((r) => ({
              metadata: r.metadata
                .filter((m) => m.id === metadataId)
                .map((m) => ({ content: m.content })),
            })),
        },
      },
    });
  }),
);

export default graphServer;
