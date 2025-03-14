import { graphql, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type {
  HashAlgo_filter,
  TimestampSet_filter,
} from "../../.graphclient/index.js";

import { dummyData } from "./data.ts";

export const graphServer = setupServer(
  graphql.query("GetHashAlgorithms", ({ variables }) => {
    const { pagesize, skip, where } = variables as {
      pagesize: number;
      skip: number;
      where: HashAlgo_filter;
    };
    return HttpResponse.json({
      data: {
        hashAlgos: dummyData.hashAlgos
          .filter((h) => {
            if (where?.ianaName && h.ianaName !== where.ianaName) return false;
            if (where?.multiHash && h.multiHash !== where.multiHash)
              return false;
            if (where?.oid && h.oid !== where.oid) return false;
            if (where?.outputLength && h.outputLength !== where.outputLength)
              return false;
            if (where?.status && h.status !== where.outputLength) return false;
            return true;
          })
          .slice(skip, skip + pagesize)
          .map((i) => ({ id: i.id })),
      },
    });
  }),

  graphql.query("GetHashAlgorithm", ({ variables }) => {
    const { hashAlgorithmId } = variables as { hashAlgorithmId: string };
    const hashAlgo = dummyData.hashAlgos.find((h) => h.id === hashAlgorithmId);
    if (!hashAlgo) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          hashAlgorithm: null,
        },
      });
    }
    const { ianaName, multiHash, oid, outputLength, status } = hashAlgo;
    return HttpResponse.json({
      data: {
        hashAlgo: { ianaName, multiHash, oid, outputLength, status },
      },
    });
  }),

  graphql.query("GetTimestamps", ({ variables }) => {
    const { pagesize, skip, where } = variables as {
      pagesize: number;
      skip: number;
      where: TimestampSet_filter;
    };
    return HttpResponse.json({
      data: {
        timestampSets: dummyData.timestampSets
          .filter((t) => {
            if (where?.creator && t.creator !== where.creator) return false;
            if (
              where?.hashAlgorithmId &&
              t.hashAlgorithmId !== where.hashAlgorithmId
            )
              return false;
            return true;
          })
          .slice(skip, skip + pagesize)
          .map((i) => ({ id: i.id })),
      },
    });
  }),

  graphql.query("GetTimestamp", ({ variables }) => {
    const { timestampId } = variables as { timestampId: string };
    const timestampSet = dummyData.timestampSets.find(
      (t) => t.id === timestampId,
    );
    if (!timestampSet) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          timestampSet: null,
        },
      });
    }
    const {
      blockNumber,
      creator,
      hashAlgorithmId,
      hashValue,
      timestamp: time,
      timestampData,
      transactionHash,
    } = timestampSet;
    return HttpResponse.json({
      data: {
        timestampSet: {
          blockNumber,
          creator,
          hashAlgorithmId,
          hashValue,
          timestamp: time,
          timestampData,
          transactionHash,
        },
      },
    });
  }),

  graphql.query("GetRecords", ({ variables }) => {
    const { pagesize, skip } = variables as { pagesize: number; skip: number };
    return HttpResponse.json({
      data: {
        records: dummyData.records
          .slice(skip, skip + pagesize)
          .map((r) => ({ id: r.id })),
      },
    });
  }),

  graphql.query("GetRecord", ({ variables }) => {
    const { recordId } = variables as { recordId: string };
    const record = dummyData.records.find((r) => r.id === recordId);
    if (!record) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          record: null,
        },
      });
    }
    const { owners, versions } = record;
    const ow = owners.map((o) => {
      const { id, notAfter, notBefore } = o;
      return { id, notAfter, notBefore };
    });
    const ve = versions.map((v) => {
      const { timestamps } = v;
      const ti = timestamps.map((t) => {
        const { hashValue } = t;
        return { hashValue };
      });
      return { timestamps: ti };
    });
    return HttpResponse.json({
      data: {
        record: {
          owners: ow,
          versions: ve,
        },
      },
    });
  }),

  graphql.query("GetRecordVersions", ({ variables }) => {
    const { pagesize, recordId, skip } = variables as {
      pagesize: number;
      recordId: string;
      skip: number;
    };
    const record = dummyData.records.find((r) => r.id === recordId);
    if (!record) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          record: null,
        },
      });
    }
    const versions = record.versions.slice(skip, skip + pagesize).map((v) => {
      const { versionNumber } = v;
      return { versionNumber };
    });
    return HttpResponse.json({
      data: {
        record: {
          versions,
        },
      },
    });
  }),

  graphql.query("GetRecordVersion", ({ variables }) => {
    const { recordId, versionNumber } = variables as {
      recordId: string;
      versionNumber: string;
    };
    const record = dummyData.records.find((r) => r.id === recordId);
    if (!record) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          record: null,
        },
      });
    }
    const version = record.versions.find(
      (v) => v.versionNumber === versionNumber,
    );
    if (!version) {
      return HttpResponse.json({
        data: {
          record: {
            versions: [],
          },
        },
      });
    }
    const { infos, timestamps } = version;
    const ti = timestamps.map((t) => {
      const { hashValue } = t;
      return { hashValue };
    });
    const inf = infos.map((i) => {
      const { content } = i;
      return { content };
    });

    return HttpResponse.json({
      data: {
        record: {
          versions: [
            {
              infos: inf,
              timestamps: ti,
            },
          ],
        },
      },
    });
  }),

  graphql.query("GetTimestampRecordIdsFirstVersion", ({ variables }) => {
    const { pagesize, skip, timestampId } = variables as {
      pagesize: number;
      skip: number;
      timestampId: string;
    };
    const timestampSet = dummyData.timestampSets.find(
      (t) => t.id === timestampId,
    );
    if (!timestampSet) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          timestamp: null,
        },
      });
    }
    const recordIdsFirstVersion = timestampSet.recordIdsFirstVersion
      .slice(skip, skip + pagesize)
      .map((r) => {
        const { id } = r;
        return { id };
      });
    return HttpResponse.json({
      data: {
        timestamp: {
          recordIdsFirstVersion,
        },
      },
    });
  }),

  graphql.query("GetOwner", ({ variables }) => {
    const { id, pagesize, skip } = variables as {
      id: string;
      pagesize: number;
      skip: number;
    };
    const owner = dummyData.owners.find((o) => o.id === id);
    if (!owner) {
      return HttpResponse.json({
        data: {
          // eslint-disable-next-line unicorn/no-null
          owner: null,
        },
      });
    }
    const recordIds = owner.recordIds.slice(skip, skip + pagesize).map((r) => {
      return { id: r.id };
    });
    return HttpResponse.json({
      data: {
        owner: {
          recordIds,
        },
      },
    });
  }),
);
