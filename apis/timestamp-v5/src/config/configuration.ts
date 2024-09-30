import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { NETWORKS, type Network } from "@cef-ebsi/ebsi-uri";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  authorisationApiUrl: string;
  ledgerApiUrl: string;
  didRegistryApiUrl: string;
  contractAddr: string;
  domain: string;
  localOrigin: string;
  network: Network;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  besuRpcNode: string;
  besuReadinessEndpoint: string;
  requestTimeout: number;
  axiosRetryDelay: number;
  testAdmin: {
    kid: string;
    privateKey: string;
  };
  testUser: {
    kid: string;
    privateKey: string;
  };
  testSpecificNodeDomain: string | undefined;
  dockerContainerTag: string;
  blockscout: {
    url: string | undefined;
    bearerToken: string | undefined;
  };
  trustedHostnames: string[];
}

const AUTH_API_PATH = "/authorisation/v5";
const DIDR_API_PATH = "/did-registry/v6";
const LEDGER_API_PATH = "/ledger/v4";

export const DEPENDENCIES = {
  "Authorisation API v5": AUTH_API_PATH,
  "DIDR API v6": DIDR_API_PATH,
  "Ledger API v4": LEDGER_API_PATH,
} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/timestamp/v5",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    besuRpcNode: process.env.BESU_RPC_NODE,
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    network: process.env.NETWORK,
    logLevel: process.env.LOG_LEVEL || "warn",
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    testAdmin: {
      kid: process.env.TEST_ADMIN_KID || "",
      privateKey: process.env.TEST_ADMIN_PRIVATE_KEY || "",
    },
    testUser: {
      kid: process.env.TEST_USER_KID || "",
      privateKey: process.env.TEST_USER_PRIVATE_KEY || "",
    },
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    dockerContainerTag: process.env.DOCKER_TAG || "",
    blockscout: {
      url: process.env.BLOCKSCOUT_URL || "",
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN || "",
    },
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
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
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    // Timestamp specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    BESU_RPC_NODE: Joi.string().uri().required(),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    CONTRACT_ADDR: Joi.string(),
    GRAPHQL_ENDPOINT: Joi.string().uri().required(),
    REQUEST_TIMEOUT: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    TRUSTED_HOSTNAMES: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
