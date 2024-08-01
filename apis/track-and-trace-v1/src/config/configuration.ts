import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { NETWORKS, type Network } from "@cef-ebsi/ebsi-uri";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  logLevel: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
  domain: string;
  localOrigin: string;
  network: Network;
  requestTimeout: number;
  axiosRetryDelay: number;
  dockerContainerTag: string;
  trustedHostnames: string[];
  // Ledger & SC
  besuRpcNode: string;
  besuReadinessEndpoint: string;
  ledgerApiUrl: string;
  contractAddr: string;
  // Authorisation API
  authorisationApiUrl: string;
  // DIDR API
  didRegistryApiUrl: string;
  // Test variables
  testAuthApiES256PrivateKey: string;
  testAuthorisedLegalEntityKid: string | undefined;
  testAuthorisedLegalEntityPrivateKey: string | undefined;
  testAuthorisedLegalEntityVcToOnboard: string | undefined;
  testRegularLegalEntityKid: string | undefined;
  testRegularLegalEntityPrivateKey: string | undefined;
  testDocWithEvents: string | undefined;
  testSpecificNodeDomain: string | undefined;
}

const AUTH_API_PATH = "/authorisation/v4";
const DIDR_API_PATH = "/did-registry/v5";
const LEDGER_API_PATH = "/ledger/v4";

export const DEPENDENCIES = {
  "Authorisation API v4": AUTH_API_PATH,
  "DIDR API v5": DIDR_API_PATH,
  "Ledger API v4": LEDGER_API_PATH,
} as const;

export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/track-and-trace/v1",
    apiName: process.env.API_NAME,
    logLevel: process.env.LOG_LEVEL || "warn",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    network: process.env.NETWORK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    dockerContainerTag: process.env.DOCKER_TAG || "",
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    // Authorisation API
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    // DIDR API
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    // Test variables
    testAuthApiES256PrivateKey:
      process.env.TEST_AUTH_API_ES256_PRIVATE_KEY || "",
    testAuthorisedLegalEntityKid: process.env.TEST_AUTHORISED_LEGAL_ENTITY_KID,
    testAuthorisedLegalEntityPrivateKey:
      process.env.TEST_AUTHORISED_LEGAL_ENTITY_PRIVATE_KEY,
    testAuthorisedLegalEntityVcToOnboard:
      process.env.TEST_AUTHORISED_LEGAL_ENTITY_VC_TO_ONBOARD,
    testRegularLegalEntityKid: process.env.TEST_REGULAR_LEGAL_ENTITY_KID,
    testRegularLegalEntityPrivateKey:
      process.env.TEST_REGULAR_LEGAL_ENTITY_PRIVATE_KEY,
    testDocWithEvents: process.env.TEST_DOC_WITH_EVENTS,
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
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
    DOMAIN: Joi.string().uri().required(),
    DOCKER_TAG: Joi.string(),
    LOCAL_ORIGIN: Joi.string().uri(),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    REQUEST_TIMEOUT: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    TRUSTED_HOSTNAMES: Joi.string(),
    // Ledger & SC
    BESU_RPC_NODE: Joi.string().uri().required(),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    CONTRACT_ADDR: Joi.string().required(),
    // Test variables
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_AUTH_API_ES256_PRIVATE_KEY: Joi.string(),
    TEST_AUTHORISED_LEGAL_ENTITY_KID: Joi.string(),
    TEST_AUTHORISED_LEGAL_ENTITY_PRIVATE_KEY: Joi.string(),
    TEST_AUTHORISED_LEGAL_ENTITY_VC_TO_ONBOARD: Joi.string(),
    TEST_REGULAR_LEGAL_ENTITY_KID: Joi.string(),
    TEST_REGULAR_LEGAL_ENTITY_PRIVATE_KEY: Joi.string(),
    TEST_DOC_WITH_EVENTS: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
