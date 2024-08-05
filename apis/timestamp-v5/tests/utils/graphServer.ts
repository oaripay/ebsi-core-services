import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummyData } from "./data.js";

export const graphServer = setupServer(
  graphql.query("GetHashAlgorithms", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };
    return HttpResponse.json({
      data: {
        hashAlgos: dummyData.hashAlgos
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
    const { skip, pagesize } = variables as { skip: number; pagesize: number };
    return HttpResponse.json({
      data: {
        timestampSets: dummyData.timestampSets
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
          timestampSet: null,
        },
      });
    }
    const {
      creator,
      blockNumber,
      transactionHash,
      timestamp: time,
      hashAlgorithmId,
      timestampData,
      hashValue,
    } = timestampSet;
    return HttpResponse.json({
      data: {
        timestampSet: {
          creator,
          blockNumber,
          transactionHash,
          timestamp: time,
          hashAlgorithmId,
          timestampData,
          hashValue,
        },
      },
    });
  }),

  graphql.query("GetRecords", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };
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
          record: null,
        },
      });
    }
    const { owners, versions } = record;
    const ow = owners.map((o) => {
      const { id, notBefore, notAfter } = o;
      return { id, notBefore, notAfter };
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
    const { recordId, skip, pagesize } = variables as {
      recordId: string;
      skip: number;
      pagesize: number;
    };
    const record = dummyData.records.find((r) => r.id === recordId);
    if (!record) {
      return HttpResponse.json({
        data: {
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
    const { timestamps, infos } = version;
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
              timestamps: ti,
              infos: inf,
            },
          ],
        },
      },
    });
  }),

  graphql.query("GetTimestampRecordIdsFirstVersion", ({ variables }) => {
    const { timestampId, skip, pagesize } = variables as {
      timestampId: string;
      skip: number;
      pagesize: number;
    };
    const timestampSet = dummyData.timestampSets.find(
      (t) => t.id === timestampId,
    );
    if (!timestampSet) {
      return HttpResponse.json({
        data: {
          timestamp: null,
        },
      });
    }
    const recordIdsFirstVersion = timestampSet.recordIdsFirstVersion.slice(
      skip,
      skip + pagesize,
    );
    return HttpResponse.json({
      data: {
        timestamp: {
          recordIdsFirstVersion,
        },
      },
    });
  }),

  graphql.query("GetOwner", ({ variables }) => {
    const { id, skip, pagesize } = variables as {
      id: string;
      skip: number;
      pagesize: number;
    };
    const owner = dummyData.owners.find((o) => o.id === id);
    if (!owner) {
      return HttpResponse.json({
        data: {
          owner: null,
        },
      });
    }
    const recordIds = owner.recordIds.slice(skip, skip + pagesize);
    return HttpResponse.json({
      data: {
        owner: {
          recordIds,
        },
      },
    });
  }),
);

export default graphServer;
