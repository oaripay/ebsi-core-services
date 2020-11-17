import { ConfigModule } from "@nestjs/config";
import cassandra, { DseClientOptions } from "cassandra-driver";
import Joi from "joi";

export interface ConfigObject {
  apiPrivateKey: string;
  apiPort: number;
  apiUrlPrefix: string;
  apiUrlOrigin: string;
  logLevel: string;
  healthcheckEbsiApi: string;
  cassandraConnection: DseClientOptions;
  optsWrite: DseClientOptions["queryOptions"];
  optsRead: DseClientOptions["queryOptions"];
  apiName: string;
}

// Default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    API_URL_ORIGIN: "https://api.intebsi.xyz",
    CASSANDRA_KEYSPACE: "ebsi_local",
    HEALTHCHECK_EBSI_API: "https://api.intebsi.xyz/docs/",
  },
  integration: {
    LOG_LEVEL: "info",
    API_URL_ORIGIN: "https://api.intebsi.xyz",
    CASSANDRA_KEYSPACE: "ebsi_integration",
    HEALTHCHECK_EBSI_API: "https://api.intebsi.xyz/docs/",
  },
  development: {
    LOG_LEVEL: "warn",
    API_URL_ORIGIN: "https://api.ebsi.xyz",
    CASSANDRA_KEYSPACE: "ebsi_development",
    HEALTHCHECK_EBSI_API: "https://api.ebsi.xyz/docs/",
  },
  production: {
    LOG_LEVEL: "error",
    API_URL_ORIGIN: "https://api.ebsi.xyz",
    CASSANDRA_KEYSPACE: "ebsi_production",
    HEALTHCHECK_EBSI_API: "https://api.ebsi.xyz/docs/",
  },
};

// Config factory
export const loadConfig = (): ConfigObject => {
  const {
    EBSI_ENV,
    CASSANDRA_CONSISTENCY_WRITE,
    CASSANDRA_CONSISTENCY_READ,
  } = process.env;

  return {
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "",
    apiUrlOrigin:
      process.env.API_URL_ORIGIN || defaultConfig[EBSI_ENV].API_URL_ORIGIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    healthcheckEbsiApi:
      process.env.HEALTHCHECK_EBSI_API ||
      defaultConfig[EBSI_ENV].HEALTHCHECK_EBSI_API,
    optsWrite: {
      consistency: cassandra.types.consistencies[
        CASSANDRA_CONSISTENCY_WRITE || "one"
      ] as DseClientOptions["queryOptions"]["consistency"],
    },
    optsRead: {
      consistency: cassandra.types.consistencies[
        CASSANDRA_CONSISTENCY_READ || "one"
      ] as DseClientOptions["queryOptions"]["consistency"],
    },
    cassandraConnection: {
      contactPoints: process.env.CASSANDRA_CONTACT_POINTS
        ? process.env.CASSANDRA_CONTACT_POINTS.split(",")
        : ["cassandradb", "localhost"],
      localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || "datacenter1",
      keyspace:
        process.env.CASSANDRA_KEYSPACE ||
        defaultConfig[EBSI_ENV].CASSANDRA_KEYSPACE,
      authProvider: new cassandra.auth.PlainTextAuthProvider(
        process.env.CASSANDRA_USER,
        process.env.CASSANDRA_PASSWORD
      ),
    },
    apiName: "ebsi-notifications",
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
    EBSI_ENV: Joi.string()
      .valid("local", "integration", "development", "production")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string().required(),
    API_URL_ORIGIN: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    HEALTHCHECK_EBSI_API: Joi.string(),
    CASSANDRA_LOCAL_DATACENTER: Joi.string(),
    CASSANDRA_KEYSPACE: Joi.string(),
    CASSANDRA_USER: Joi.string().required(),
    CASSANDRA_PASSWORD: Joi.string().required(),
    CASSANDRA_CONSISTENCY_WRITE: Joi.string().valid(
      "any",
      "one",
      "two",
      "three",
      "quorum",
      "all",
      "localQuorum",
      "eachQuorum",
      "localOne"
    ),
    CASSANDRA_CONSISTENCY_READ: Joi.string().valid(
      "any",
      "one",
      "two",
      "three",
      "quorum",
      "all",
      "localQuorum",
      "eachQuorum",
      "localOne"
    ),
  }),
});
