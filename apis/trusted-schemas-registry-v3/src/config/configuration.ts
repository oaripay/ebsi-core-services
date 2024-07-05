import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { NETWORKS, type Network } from "@cef-ebsi/ebsi-uri";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  domain: string;
  localOrigin: string;
  network: Network;
  trustedHostnames: string[];
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  requestTimeout: number;
  axiosRetryDelay: number;
  // Ledger & SC
  besuRpcNode: string;
  ledgerApiUrl: string;
  contractAddr: string;
  // Authorisation API
  authorisationApiUrl: string;
  // DID Registry API
  didRegistryApiUrl: string;
  // Test variables
  testAdminKid: string | undefined;
  testAdminPrivateKey: string | undefined;
  testVaSchemaUrl: string;
  testSpecificNodeDomain: string | undefined;
  dockerContainerTag: string;
  blockscout: {
    url: string | undefined;
    bearerToken: string | undefined;
  };
}

const AUTH_API_PATH = "/authorisation/v4";
const DIDR_API_PATH = "/did-registry/v5";
const LEDGER_API_PATH = "/ledger/v4";
const TSR_API_PATH = "/trusted-schemas-registry/v3";

export const DEPENDENCIES = {
  "Authorisation API v4": AUTH_API_PATH,
  "DIDR API v5": DIDR_API_PATH,
  "Ledger API v4": LEDGER_API_PATH,
  "TSR API v3": TSR_API_PATH,
} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-schemas-registry/v3",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    network: process.env.NETWORK,
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    logLevel: process.env.LOG_LEVEL || "warn",
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    // Authorisation API
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    // DID Registry API
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    // Test vars
    testAdminKid: process.env.TEST_ADMIN_KID,
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY,
    testVaSchemaUrl: `${DOMAIN}${TSR_API_PATH}/schemas/${process.env.TEST_VA_SCHEMA}`,
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    dockerContainerTag: process.env.DOCKER_TAG || "",
    blockscout: {
      url: process.env.BLOCKSCOUT_URL,
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN,
    },
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
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    TRUSTED_HOSTNAMES: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    // Ledger & SC
    BESU_RPC_NODE: Joi.string().uri().required(),
    CONTRACT_ADDR: Joi.string().required(),
    // Test vars
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_VA_SCHEMA: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
