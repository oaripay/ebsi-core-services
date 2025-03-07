import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type {
  Attribute_filter,
  Issuer_filter,
} from "../../.graphclient/index.js";

import { dummyIssuers } from "./data.ts";

export const graphServer = setupServer(
  graphql.query("GetIssuers", ({ variables }) => {
    const { pagesize, skip, where } = variables as {
      pagesize: number;
      skip: number;
      where?: Issuer_filter;
    };
    return HttpResponse.json({
      data: {
        issuers: dummyIssuers
          .filter((i) => {
            if (
              where?.attributes_?.id &&
              !i.attributes.some((a) => a.id === where.attributes_!.id)
            )
              return false;
            if (
              where?.proxies_?.id &&
              !i.proxies.some((p) => p.id === where.proxies_!.id)
            )
              return false;
            return true;
          })
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
          // eslint-disable-next-line unicorn/no-null
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
    const { did, pagesize, skip, where } = variables as {
      did: string;
      pagesize: number;
      skip: number;
      where?: Attribute_filter;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          issuer: null,
        },
      });
    return HttpResponse.json({
      data: {
        issuer: {
          attributes: issuer.attributes
            .filter((a) => {
              if (
                where?.lastRevision_ &&
                a.lastRevision.issuerType !== where.lastRevision_.issuerType
              )
                return false;
              return true;
            })
            .slice(skip, skip + pagesize)
            .map((i) => ({ id: i.id })),
        },
      },
    });
  }),

  graphql.query("GetAttribute", ({ variables }) => {
    const { attributeId, did } = variables as {
      attributeId: string;
      did: string;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
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
    const { attributeId, did, pagesize, skip } = variables as {
      attributeId: string;
      did: string;
      pagesize: number;
      skip: number;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
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
    const { did, pagesize, skip } = variables as {
      did: string;
      pagesize: number;
      skip: number;
    };
    const issuer = dummyIssuers.find((i) => i.id === did);
    if (!issuer)
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
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
          // eslint-disable-next-line unicorn/no-null
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
