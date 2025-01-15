import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

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
  besuTrustedIssuersRegistryAddress: string;
  blockscout: {
    bearerToken: string;
    url: string;
  };
  // DID Registry API
  didRegistryApiUrl: string;
  dockerContainerTag: string;
  domain: string;
  ebsiEnvConfig: EbsiEnvConfiguration;
  ledgerApiUrl: string;
  localOrigin: string | undefined;
  logLevel: "debug" | "error" | "log" | "silent" | "verbose" | "warn";
  requestTimeout: number;
  testAdminAccreditation: string;
  // Test variables
  testAdminKid: string;
  testAdminPrivateKey: string;
  testIssuerWithProxyKid: string;
  testIssuerWithProxyPrivateKey: string;
  testSpecificNodeDomain: string | undefined;
  testStatusListSchemaId: string;
  testVerifiableAttestationSchemaId: string;
  // TSR API (used in tests only)
  trustedSchemasRegistryApiUrl: string;
}

export const SERVICE_PREFIX = "trusted-issuers-registry";
export const SERVICE_VERSION = "v4";

// Declare all the services and their versions used by this service
interface ServiceVersions {
  authorisation: "v3";
  "did-registry": "v4";
  ledger: "v3";
  "trusted-policies-registry": "v2";
  "trusted-schemas-registry": "v2";
}

// EBSI Services that must be up and running before this service starts
export const BOOTSTRAP_DEPENDENCIES = {
  authorisation: "v3",
} as const satisfies Partial<ServiceVersions>;

// EBSI Services that must be up and running for this service to be considered healthy
export const RUNTIME_DEPENDENCIES = {
  authorisation: "v3",
  "did-registry": "v4",
  "trusted-policies-registry": "v2",
  "trusted-schemas-registry": "v2",
} as const satisfies Partial<ServiceVersions>;

// EBSI Services that are only used during the tests
export const DEV_DEPENDENCIES = {
  ledger: "v3",
} as const satisfies Partial<ServiceVersions>;

export const loadConfig = () => {
  const { DOMAIN, URI_SCHEME } = process.env;

  const ebsiEnvConfig = {
    hosts: [
      DOMAIN.replace(/^https?:\/\//, ""), // remove http protocol scheme
    ],
    network: {
      isOptional: process.env.NETWORK === "production",
      name: process.env.NETWORK,
    },
    scheme: URI_SCHEME ?? "ebsi",
    services: {
      ...RUNTIME_DEPENDENCIES,
      "trusted-issuers-registry": SERVICE_VERSION, // self-reference
    },
  } as const satisfies EbsiEnvConfiguration;

  return {
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: `/${SERVICE_PREFIX}/${SERVICE_VERSION}`,
    // Authorisation API
    authorisationApiUrl: `${DOMAIN}/authorisation/${RUNTIME_DEPENDENCIES.authorisation}`,
    axiosRetryDelay: Number.parseInt(
      process.env.AXIOS_RETRY_DELAY ?? "10000",
      10,
    ),
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    besuTrustedIssuersRegistryAddress:
      process.env.BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    blockscout: {
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN ?? "",
      url: process.env.BLOCKSCOUT_URL ?? "",
    },
    // DID Registry API
    didRegistryApiUrl: `${DOMAIN}/did-registry/${RUNTIME_DEPENDENCIES["did-registry"]}`,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    ebsiEnvConfig,
    ledgerApiUrl: `${DOMAIN}/ledger/${DEV_DEPENDENCIES.ledger}`,
    localOrigin: process.env.LOCAL_ORIGIN,
    logLevel: process.env.LOG_LEVEL ?? "warn",
    requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT ?? "15000", 10),
    testAdminAccreditation: process.env.TEST_ADMIN_ACCREDITATION ?? "",
    // Test vars
    testAdminKid: process.env.TEST_ADMIN_KID ?? "",
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY ?? "",
    testIssuerWithProxyKid: process.env.TEST_ISSUER_WITH_PROXY_KID ?? "",
    testIssuerWithProxyPrivateKey:
      process.env.TEST_ISSUER_WITH_PROXY_PRIVATE_KEY ?? "",
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    testStatusListSchemaId: process.env.TEST_STATUS_LIST_SCHEMA_ID ?? "",
    testVerifiableAttestationSchemaId:
      process.env.TEST_VERIFIABLE_ATTESTATION_SCHEMA_ID ?? "",
    // TSR API
    trustedSchemasRegistryApiUrl: `${DOMAIN}/trusted-schemas-registry/${RUNTIME_DEPENDENCIES["trusted-schemas-registry"]}`,
  } as const satisfies ApiConfig;
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
    AXIOS_RETRY_DELAY: Joi.string(),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    // Ledger & SC
    BESU_RPC_NODE: Joi.string().uri().required(),
    BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: Joi.string().required(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    BLOCKSCOUT_URL: Joi.string(),
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
    NETWORK: Joi.string(),
    // Common API variables
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_ADMIN_ACCREDITATION: Joi.string().uri(),
    // Test vars
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_ISSUER_WITH_PROXY_KID: Joi.string(),
    TEST_ISSUER_WITH_PROXY_PRIVATE_KEY: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    TEST_STATUS_LIST_SCHEMA_ID: Joi.string(),
    TEST_VERIFIABLE_ATTESTATION_SCHEMA_ID: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
    // EBSI URI Scheme prefix
    URI_SCHEME: Joi.string(),
  }),
});
