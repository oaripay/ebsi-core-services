import { type Network, NETWORKS } from "@cef-ebsi/ebsi-uri";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  // Authorisation API
  authorisationApiUrl: string;
  axiosRetryDelay: number;
  besuReadinessEndpoint: string;
  // Ledger & SC
  besuRpcNode: string;
  contractAddr: string;
  // DIDR API
  didRegistryApiUrl: string;
  dockerContainerTag: string;
  domain: string;
  ledgerApiUrl: string;
  localOrigin: string;
  logLevel: "debug" | "error" | "log" | "silent" | "verbose" | "warn";
  network: Network;
  requestTimeout: number;
  // Test variables
  testAuthApiES256PrivateKey: string;
  testAuthorisedLegalEntityKid: string | undefined;
  testAuthorisedLegalEntityPrivateKey: string | undefined;
  testAuthorisedLegalEntityVcToOnboard: string | undefined;
  testDocWithEvents: string | undefined;
  testRegularLegalEntityKid: string | undefined;
  testRegularLegalEntityPrivateKey: string | undefined;
  testSpecificNodeDomain: string | undefined;
  trustedHostnames: string[];
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
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX ?? "/track-and-trace/v1",
    // Authorisation API
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    axiosRetryDelay: Number.parseInt(
      process.env.AXIOS_RETRY_DELAY ?? "10000",
      10,
    ),
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    contractAddr: process.env.CONTRACT_ADDR,
    // DIDR API
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    localOrigin: process.env.LOCAL_ORIGIN ?? "",
    logLevel: process.env.LOG_LEVEL ?? "warn",
    network: process.env.NETWORK,
    requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT ?? "15000", 10),
    // Test variables
    testAuthApiES256PrivateKey:
      process.env.TEST_AUTH_API_ES256_PRIVATE_KEY ?? "",
    testAuthorisedLegalEntityKid: process.env.TEST_AUTHORISED_LEGAL_ENTITY_KID,
    testAuthorisedLegalEntityPrivateKey:
      process.env.TEST_AUTHORISED_LEGAL_ENTITY_PRIVATE_KEY,
    testAuthorisedLegalEntityVcToOnboard:
      process.env.TEST_AUTHORISED_LEGAL_ENTITY_VC_TO_ONBOARD,
    testDocWithEvents: process.env.TEST_DOC_WITH_EVENTS,
    testRegularLegalEntityKid: process.env.TEST_REGULAR_LEGAL_ENTITY_KID,
    testRegularLegalEntityPrivateKey:
      process.env.TEST_REGULAR_LEGAL_ENTITY_PRIVATE_KEY,
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
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
    CONTRACT_ADDR: Joi.string().required(),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
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
    TEST_AUTH_API_ES256_PRIVATE_KEY: Joi.string(),
    TEST_AUTHORISED_LEGAL_ENTITY_KID: Joi.string(),
    TEST_AUTHORISED_LEGAL_ENTITY_PRIVATE_KEY: Joi.string(),
    TEST_AUTHORISED_LEGAL_ENTITY_VC_TO_ONBOARD: Joi.string(),
    TEST_DOC_WITH_EVENTS: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    // Test variables
    TEST_ENV: Joi.string(),
    TEST_REGULAR_LEGAL_ENTITY_KID: Joi.string(),
    TEST_REGULAR_LEGAL_ENTITY_PRIVATE_KEY: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    TRUSTED_HOSTNAMES: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
