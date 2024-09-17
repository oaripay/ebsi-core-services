/* eslint-disable no-underscore-dangle */
import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummyIssuers } from "./data.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { Attribute_filter, Issuer_filter } from "../../.graphclient/index.js";

export const graphServer = setupServer(
  graphql.query("GetIssuers", ({ variables }) => {
    const { skip, pagesize, where } = variables as {
      skip: number;
      pagesize: number;
      where?: Issuer_filter;
    };
    return HttpResponse.json({
      data: {
        issuers: dummyIssuers
          .filter((i) => {
            if (
              where &&
              where.attributes_ &&
              where.attributes_.id &&
              !i.attributes.find((a) => a.id === where.attributes_!.id)
            )
              return false;
            if (
              where &&
              where.proxies_ &&
              where.proxies_.id &&
              !i.proxies.find((p) => p.id === where.proxies_!.id)
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
    const { did, skip, pagesize, where } = variables as {
      did: string;
      skip: number;
      pagesize: number;
      where?: Attribute_filter;
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
            .filter((a) => {
              if (
                where &&
                where.lastRevision_ &&
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
