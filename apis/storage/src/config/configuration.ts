import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  // Storage API
  apiPort: number;
  apiUrlPrefix: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
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
  testLoadBalancerDomain: string;
  dockerContainerTag: string;
}

const AUTH_API_PATH = "/authorisation/v2";
const TAR_API_PATH = "/trusted-apps-registry/v3";
const HEALTH_CHECK_PATH = "/docs/";

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/storage/v3",
    logLevel: process.env.LOG_LEVEL || "warn",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    // TAR API
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    // Test vars
    testAppName: process.env.TEST_APP_NAME,
    testAppPrivateKey: process.env.TEST_APP_PRIVATE_KEY,
    testClientKid: process.env.TEST_CLIENT_KID,
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY,
    testLoadBalancerDomain: process.env.TEST_LB_DOMAIN || "",
    dockerContainerTag: process.env.DOCKER_TAG || "",
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
  validationSchema: Joi.object<typeof process.env, true>({
    // Common API variables
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
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    ENCRYPTION_SECRET: Joi.string().required(),
    // Authorisation API
    AUTHORISATION_API_NAME: Joi.string(),
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
    CASSANDRA_KEYSPACE: Joi.string().required(),
    // Test variables
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_KID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
    TEST_LB_DOMAIN: Joi.string().uri(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
