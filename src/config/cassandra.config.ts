import { registerAs } from "@nestjs/config";
import { DseClientOptions, types, auth } from "cassandra-driver";

export interface CassandraConsistency {
  read: types.consistencies;
  write: types.consistencies;
}

export interface CassandraOptions {
  client: DseClientOptions;
  consistency: CassandraConsistency;
}

const defaultConfig = {
  local: {
    KEYSPACE: "ebsi_test",
  },
  test: {
    KEYSPACE: "ebsi_test",
  },
  pilot: {
    KEYSPACE: "ebsi_pilot",
  },
  prod: {
    KEYSPACE: "ebsi_prod",
  },
};

export const cassandraConfig = registerAs(
  "cassandra",
  (): CassandraOptions => ({
    client: {
      contactPoints: (process.env.CASSANDRA_CONTACT_POINTS &&
        process.env.CASSANDRA_CONTACT_POINTS.split(",")) || [
        "cassandradb",
        "localhost",
      ],
      localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || "datacenter1",
      keyspace:
        process.env.CASSANDRA_KEYSPACE ||
        defaultConfig[process.env.EBSI_ENV].KEYSPACE,
      authProvider: new auth.PlainTextAuthProvider(
        process.env.CASSANDRA_USER,
        process.env.CASSANDRA_PASSWORD
      ),
    },
    consistency: {
      read:
        (process.env.CASSANDRA_CONSISTENCY_READ &&
          types.consistencies[process.env.CASSANDRA_CONSISTENCY_READ]) ||
        types.consistencies.two,
      write:
        (process.env.CASSANDRA_CONSISTENCY_WRITE &&
          types.consistencies[process.env.CASSANDRA_CONSISTENCY_WRITE]) ||
        types.consistencies.two,
    },
  })
);

export default cassandraConfig;
