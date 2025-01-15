import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  authorisationApiUrl: string;
  axiosRetryDelay: number;
  besuReadinessEndpoint: string;
  besuRpcNode: string;
  blockscout: {
    bearerToken: string;
    url: string;
  };
  contractAddr: string;
  dockerContainerTag: string;
  domain: string;
  ebsiEnvConfig: EbsiEnvConfiguration;
  ledgerApiUrl: string;
  localOrigin: string | undefined;
  logLevel: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
  requestTimeout: number;
  testAuthApiV5ES256PrivateKey: string;
  testSpecificNodeDomain: string | undefined;
  testUserDid: string;
}

export const SERVICE_PREFIX = "did-registry";
export const SERVICE_VERSION = "v6";

// Declare all the services and their versions used by this service
interface ServiceVersions {
  authorisation: "v5";
  ledger: "v4";
  "trusted-issuers-registry": "v6";
  "trusted-policies-registry": "v4";
  "trusted-schemas-registry": "v4";
}

// EBSI Services that must be up and running before this service starts
export const BOOTSTRAP_DEPENDENCIES = {
  authorisation: "v5",
} as const satisfies Partial<ServiceVersions>;

// EBSI Services that must be up and running for this service to be considered healthy
export const RUNTIME_DEPENDENCIES = {
  authorisation: "v5",
} as const satisfies Partial<ServiceVersions>;

// EBSI Services that are only used during the tests
export const DEV_DEPENDENCIES = {
  ledger: "v4",
  "trusted-issuers-registry": "v6",
  "trusted-policies-registry": "v4",
  "trusted-schemas-registry": "v4",
} as const satisfies Partial<ServiceVersions>;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
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
      ...DEV_DEPENDENCIES,
      "did-registry": SERVICE_VERSION, // self-reference
    },
  } as const satisfies EbsiEnvConfiguration;

  return {
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: `/${SERVICE_PREFIX}/${SERVICE_VERSION}/jsonrpc`,
    authorisationApiUrl: `${DOMAIN}/authorisation/${RUNTIME_DEPENDENCIES.authorisation}`,
    axiosRetryDelay: Number.parseInt(
      process.env.AXIOS_RETRY_DELAY ?? "10000",
      10,
    ),
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    besuRpcNode: process.env.BESU_RPC_NODE,
    blockscout: {
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN ?? "",
      url: process.env.BLOCKSCOUT_URL ?? "",
    },
    contractAddr: process.env.CONTRACT_ADDR,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    ebsiEnvConfig,
    ledgerApiUrl: `${DOMAIN}/ledger/${DEV_DEPENDENCIES.ledger}`,
    localOrigin: process.env.LOCAL_ORIGIN,
    logLevel: process.env.LOG_LEVEL ?? "warn",
    requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT ?? "15000", 10),
    testAuthApiV5ES256PrivateKey:
      process.env.TEST_AUTH_API_V4_ES256_PRIVATE_KEY ?? "",
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    testUserDid: process.env.TEST_USER_DID ?? "",
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
    BESU_RPC_NODE: Joi.string().uri().required(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    BLOCKSCOUT_URL: Joi.string(),
    CONTRACT_ADDR: Joi.string().required(),
    DOCKER_TAG: Joi.string(),
    // DID Registry specific variables
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
    TEST_AUTH_API_V4_ES256_PRIVATE_KEY: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    TEST_USER_DID: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
    // EBSI URI Scheme prefix
    URI_SCHEME: Joi.string(),
  }),
});
