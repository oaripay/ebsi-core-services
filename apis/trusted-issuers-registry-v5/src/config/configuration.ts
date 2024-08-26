import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { NETWORKS, type Network } from "@cef-ebsi/ebsi-uri";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  logLevel: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
  domain: string;
  localOrigin: string;
  network: Network;
  requestTimeout: number;
  axiosRetryDelay: number;
  trustedHostnames: string[];
  // Ledger & SC
  besuRpcNode: string;
  besuReadinessEndpoint: string;
  ledgerApiUrl: string;
  besuTrustedIssuersRegistryAddress: string;
  // Authorisation API
  authorisationApiUrl: string;
  // DID Registry API
  didRegistryApiUrl: string;
  // TSR API (using in tests only)
  trustedSchemasRegistryApiUrl: string;
  // Test variables
  testAdminKid: string;
  testAdminPrivateKey: string;
  testAdminAccreditation: string;
  testIssuerWithProxyKid: string;
  testIssuerWithProxyPrivateKey: string;
  testVerifiableAttestationSchemaId: string;
  testStatusListSchemaId: string;
  testSpecificNodeDomain: string | undefined;
  dockerContainerTag: string;
  blockscout: {
    url: string;
    bearerToken: string;
  };
}

const AUTH_API_PATH = "/authorisation/v4";
const DIDR_API_PATH = "/did-registry/v5";
const LEDGER_API_PATH = "/ledger/v4";
const TPR_API_PATH = "/trusted-policies-registry/v3";
const TSR_API_PATH = "/trusted-schemas-registry/v3";

export const DEPENDENCIES = {
  "Authorisation API v4": AUTH_API_PATH,
  "DIDR API v5": DIDR_API_PATH,
  "Ledger API v4": LEDGER_API_PATH,
  "TPR API v3": TPR_API_PATH,
  "TSR API v3": TSR_API_PATH,
} as const;

export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-issuers-registry/v5",
    logLevel: process.env.LOG_LEVEL || "warn",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    network: process.env.NETWORK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    besuTrustedIssuersRegistryAddress:
      process.env.BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    // Authorisation API
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    // DID Registry API
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    // TSR API
    trustedSchemasRegistryApiUrl: DOMAIN + TSR_API_PATH,
    // Test vars
    testAdminKid: process.env.TEST_ADMIN_KID ?? "",
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY ?? "",
    testAdminAccreditation: process.env.TEST_ADMIN_ACCREDITATION ?? "",
    testIssuerWithProxyKid: process.env.TEST_ISSUER_WITH_PROXY_KID ?? "",
    testIssuerWithProxyPrivateKey:
      process.env.TEST_ISSUER_WITH_PROXY_PRIVATE_KEY ?? "",
    testVerifiableAttestationSchemaId:
      process.env.TEST_VERIFIABLE_ATTESTATION_SCHEMA_ID ?? "",
    testStatusListSchemaId: process.env.TEST_STATUS_LIST_SCHEMA_ID ?? "",
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    dockerContainerTag: process.env.DOCKER_TAG || "",
    blockscout: {
      url: process.env.BLOCKSCOUT_URL ?? "",
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN ?? "",
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
    API_URL_PREFIX: Joi.string(),
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
    BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: Joi.string().required(),
    // Test vars
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_ADMIN_ACCREDITATION: Joi.string().uri(),
    TEST_ISSUER_WITH_PROXY_KID: Joi.string(),
    TEST_ISSUER_WITH_PROXY_PRIVATE_KEY: Joi.string(),
    TEST_VERIFIABLE_ATTESTATION_SCHEMA_ID: Joi.string(),
    TEST_STATUS_LIST_SCHEMA_ID: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
