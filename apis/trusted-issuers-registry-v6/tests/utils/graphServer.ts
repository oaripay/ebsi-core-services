import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummyIssuers } from "./data.js";

export const graphServer = setupServer(
  graphql.query("GetIssuers", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };
    return HttpResponse.json({
      data: {
        issuers: dummyIssuers
          .slice(skip, skip + pagesize)
          .map((i) => ({ id: i.id })),
      },
    });
  }),

  graphql.query("GetIssuer", ({ variables }) => {
    const { did } = variables as { did: string };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          attributes: issuer.attributes.map((a) => ({
            lastRevision: a.lastRevision,
          })),
        },
      },
    });
  }),

  graphql.query("GetAttributes", ({ variables }) => {
    const { did, skip, pagesize } = variables as {
      did: string;
      skip: number;
      pagesize: number;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          attributes: issuer.attributes
            .slice(skip, skip + pagesize)
            .map((i) => ({ id: i.id })),
        },
      },
    });
  }),

  graphql.query("GetAttribute", ({ variables }) => {
    const { did, attributeId } = variables as {
      did: string;
      attributeId: string;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          attributes: issuer.attributes
            .filter((a) => a.id === attributeId)
            .map((a) => ({ lastRevision: a.lastRevision })),
        },
      },
    });
  }),

  graphql.query("GetRevisions", ({ variables }) => {
    const { did, attributeId, skip, pagesize } = variables as {
      did: string;
      attributeId: string;
      skip: number;
      pagesize: number;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          attributes: issuer.attributes
            .filter((a) => a.id === attributeId)
            .map((a) => ({
              revisions: a.revisions.slice(skip, skip + pagesize),
            })),
        },
      },
    });
  }),

  graphql.query("GetProxies", ({ variables }) => {
    const { did, skip, pagesize } = variables as {
      did: string;
      skip: number;
      pagesize: number;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          proxies: issuer.proxies
            .slice(skip, skip + pagesize)
            .map((i) => ({ id: i.id })),
        },
      },
    });
  }),

  graphql.query("GetProxy", ({ variables }) => {
    const { did, proxyId } = variables as { did: string; proxyId: string };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          proxies: issuer.proxies
            .filter((p) => p.id === proxyId)
            .map((p) => ({ data: p.data })),
        },
      },
    });
  }),
);
export default graphServer;
