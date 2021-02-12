import { ConfigModule } from "@nestjs/config";
import cassandra, { DseClientOptions, types } from "cassandra-driver";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface CassandraConsistency {
  read: types.consistencies;
  write: types.consistencies;
}
export interface CassandraOptions {
  connection: DseClientOptions;
  consistency: CassandraConsistency;
}
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  logLevel: string;
  domain: string;
  externalEbsiApiHealthCheck: string;
  cassandraOptions: CassandraOptions;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    KEYSPACE: "ebsi_test",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    KEYSPACE: "ebsi_test",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.pilot.ebsi.xyz",
    HEALTH_CHECK: "https://api.pilot.ebsi.xyz/docs/",
    KEYSPACE: "ebsi_pilot",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.prod.ebsi.xyz",
    HEALTH_CHECK: "https://api.prod.ebsi.xyz/docs/",
    KEYSPACE: "ebsi_prod",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/storage/v2",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    cassandraOptions: {
      connection: {
        contactPoints: (process.env.CASSANDRA_CONTACT_POINTS &&
          process.env.CASSANDRA_CONTACT_POINTS.split(",")) || [
          "cassandradb",
          "localhost",
        ],
        localDataCenter:
          process.env.CASSANDRA_LOCAL_DATACENTER || "datacenter1",
        keyspace:
          process.env.CASSANDRA_KEYSPACE || defaultConfig[EBSI_ENV].KEYSPACE,
        authProvider: new cassandra.auth.PlainTextAuthProvider(
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
    },
  };
};

export const ApiConfigModule = ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    ".env.local",
    ".env",
  ],
  load: [loadConfig],
  validationSchema: Joi.object({
    // Common API variables
    EBSI_ENV: Joi.string().valid("local", "test", "pilot", "prod").required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    DOMAIN: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    // Storage specific variables
    CASSANDRA_USER: Joi.string().required(),
    CASSANDRA_PASSWORD: Joi.string().required(),
    CASSANDRA_CONSISTENCY_READ: Joi.string().valid(
      "any",
      "one",
      "two",
      "three",
      "quorum",
      "all",
      "localQuorum",
      "eachQuorum",
      "serial",
      "localSerial",
      "localOne"
    ),
    CASSANDRA_CONSISTENCY_WRITE: Joi.string().valid(
      "any",
      "one",
      "two",
      "three",
      "quorum",
      "all",
      "localQuorum",
      "eachQuorum",
      "serial",
      "localSerial",
      "localOne"
    ),
    CASSANDRA_CONTACT_POINTS: Joi.string(),
    CASSANDRA_LOCAL_DATACENTER: Joi.string(),
    CASSANDRA_KEYSPACE: Joi.string(),
  }),
});
