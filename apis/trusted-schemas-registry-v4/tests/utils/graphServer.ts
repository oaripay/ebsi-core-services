/* eslint-disable no-underscore-dangle */
import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummySchemas } from "./data.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { Revision_filter, Schema_filter } from "../../.graphclient/index.js";

export const graphServer = setupServer(
  graphql.query("GetSchemas", ({ variables }) => {
    const { skip, pagesize, where } = variables as {
      skip: number;
      pagesize: number;
      where: Schema_filter;
    };
    return HttpResponse.json({
      data: {
        schemas: dummySchemas
          .filter((s) => {
            if (
              where &&
              where.revisions_ &&
              where.revisions_.id &&
              !s.revisions.find((r) => r.id === where.revisions_!.id)
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
    const { schemaId, skip, pagesize, where } = variables as {
      schemaId: string;
      skip: number;
      pagesize: number;
      where: Revision_filter;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => {
              if (
                where &&
                where.metadata_ &&
                !r.metadata.find((m) => m.id === where.metadata_!.id)
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
          schema: null,
        },
      });
    return HttpResponse.json({
      data: {
        schema: {
          revisions: schema.revisions
            .filter((r) => {
              if (
                where &&
                where.metadata_ &&
                !r.metadata.find((m) => m.id === where.metadata_!.id)
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
    const { schemaId, revisionId } = variables as {
      schemaId: string;
      revisionId: string;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
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
    const { schemaId, revisionId, skip, pagesize } = variables as {
      schemaId: string;
      revisionId: string;
      skip: number;
      pagesize: number;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
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
    const { schemaId, revisionId, metadataId } = variables as {
      schemaId: string;
      revisionId: string;
      metadataId: string;
    };
    const schema = dummySchemas.find((s) => s.id === schemaId);
    if (!schema)
      return HttpResponse.json({
        data: {
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
