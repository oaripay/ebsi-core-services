import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  // Storage API
  apiPort: number;
  apiUrlPrefix: string;
  logLevel: string;
  domain: string;
  localOrigin: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  encryptionSecret: string;
  // Authorisation API
  authorisationApiName: string;
  authorisationApiUrl: string;
  // TAR API
  trustedAppsRegistryApiUrl: string;
  // Test variables
  testAppName: string;
  testAppPrivateKey: string;
  testClientKid: string;
  testClientPrivateKey: string;
  dockerContainerTag: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    KEYSPACE: "ebsi_test",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    KEYSPACE: "ebsi_test",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
  },
  conformance: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.conformance.intebsi.xyz",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    KEYSPACE: "ebsi_test",
    TRUSTED_APPS_REGISTRY:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    KEYSPACE: "ebsi_pilot",
    TRUSTED_APPS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    KEYSPACE: "ebsi_prod",
    TRUSTED_APPS_REGISTRY: "https://api.ebsi.eu/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/storage/v3",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    // TAR API
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY,
    // Test vars
    testAppName: process.env.TEST_APP_NAME,
    testAppPrivateKey: process.env.TEST_APP_PRIVATE_KEY,
    testClientKid: process.env.TEST_CLIENT_KID,
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY,
    dockerContainerTag,
  };
};

export const ApiConfigModule = ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    ".env.default.local",
    ".env.default",
  ],
  load: [loadConfig],
  validationSchema: Joi.object({
    // Common API variables
    EBSI_ENV: Joi.string()
      .valid("local", "test", "conformance", "pilot", "prod")
      .required(),
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
    LOCAL_ORIGIN: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    ENCRYPTION_SECRET: Joi.string().required(),
    // Authorisation API
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    // TAR API
    TRUSTED_APPS_REGISTRY: Joi.string().uri(),
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
    // Test variables
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_KID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
  }),
});
