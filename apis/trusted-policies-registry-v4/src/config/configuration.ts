import { type Network, NETWORKS } from "@cef-ebsi/ebsi-uri";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  authorisationApiUrl: string;
  axiosRetryDelay: number;
  besuReadinessEndpoint: string;
  // Ledger & SC
  besuRpcNode: string;
  blockscout: {
    bearerToken: string | undefined;
    url: string | undefined;
  };
  contractAddr: string;
  didRegistryApiUrl: string;
  dockerContainerTag: string;
  domain: string;
  ledgerApiUrl: string;
  localOrigin: string;
  logLevel: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
  network: Network;
  requestTimeout: number;
  // Tests
  testAdminKid: string;
  testAdminPrivateKey: string;
  testSpecificNodeDomain: string | undefined;
  testUserKid: string;
  testUserPrivateKey: string;
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
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX ?? "/trusted-policies-registry/v4",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    axiosRetryDelay: Number.parseInt(
      process.env.AXIOS_RETRY_DELAY ?? "10000",
      10,
    ),
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    blockscout: {
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN,
      url: process.env.BLOCKSCOUT_URL,
    },
    contractAddr: process.env.CONTRACT_ADDR,
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    localOrigin: process.env.LOCAL_ORIGIN ?? "",
    logLevel: process.env.LOG_LEVEL ?? "warn",
    network: process.env.NETWORK,
    requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT ?? "15000", 10),
    testAdminKid: process.env.TEST_ADMIN_KID ?? "",
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY ?? "",
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    testUserKid: process.env.TEST_USER_KID ?? "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY ?? "",
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES ?? "")
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
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    // Ledger & SC
    BESU_RPC_NODE: Joi.string().uri().required(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    BLOCKSCOUT_URL: Joi.string(),
    CONTRACT_ADDR: Joi.string().required(),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    GRAPHQL_ENDPOINT: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    // Common API variables
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    REQUEST_TIMEOUT: Joi.string(),
    // Tests
    TEST_ADMIN_KID: Joi.string().allow(""),
    TEST_ADMIN_PRIVATE_KEY: Joi.string().allow(""),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    TEST_USER_KID: Joi.string().allow(""),
    TEST_USER_PRIVATE_KEY: Joi.string().allow(""),
    TRUSTED_HOSTNAMES: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
