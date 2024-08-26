import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { NETWORKS, type Network } from "@cef-ebsi/ebsi-uri";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  authorisationApiName: string;
  authorisationApiUrl: string;
  contractAddr: string;
  domain: string;
  localOrigin: string;
  network: Network;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  besuRpcNode: string;
  besuReadinessEndpoint: string;
  ledgerApiUrl: string;
  requestTimeout: number;
  axiosRetryDelay: number;
  trustedAppsRegistryApiUrl: string;
  authorisationCredentialSchema: string;
  usersOnboardingApiDid: string;
  usersOnboardingApiPrivateKey: string;
  trustedHostnames: string[];
  testClientKid: string | undefined;
  testClientPrivateKey: string | undefined;
  testLoadBalancerDomain: string | undefined;
  testSpecificNodeDomain: string | undefined;
  dockerContainerTag: string;
  blockscout: {
    url: string | undefined;
    bearerToken: string | undefined;
  };
}

const AUTH_API_PATH = "/authorisation/v2";
const LEDGER_API_PATH = "/ledger/v3";
const TAR_API_PATH = "/trusted-apps-registry/v3";
const TSR_API_PATH = "/trusted-schemas-registry/v2";

export const DEPENDENCIES = {
  "Authorisation API v2": AUTH_API_PATH,
  "Ledger API v3": LEDGER_API_PATH,
  "TAR API v3": TAR_API_PATH,
  "TSR API v2": TSR_API_PATH,
} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/did-registry/v3",
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    besuRpcNode: process.env.BESU_RPC_NODE,
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    network: process.env.NETWORK,
    logLevel: process.env.LOG_LEVEL || "warn",
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    authorisationCredentialSchema: `${DOMAIN}${TSR_API_PATH}/schemas/${
      process.env.AUTHORISATION_CREDENTIAL_SCHEMA || ""
    }`,
    usersOnboardingApiDid: process.env.USERS_ONBOARDING_API_DID || "",
    usersOnboardingApiPrivateKey:
      process.env.USERS_ONBOARDING_API_PRIVATE_KEY || "",
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    testClientKid: process.env.TEST_CLIENT_KID,
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY,
    testLoadBalancerDomain: process.env.TEST_LB_DOMAIN || "",
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
    API_URL_PREFIX: Joi.string(),
    AUTHORISATION_API_NAME: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    CONTRACT_ADDR: Joi.string().required(),
    // DID Registry specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    BESU_RPC_NODE: Joi.string().uri().required(),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    REQUEST_TIMEOUT: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string(),
    USERS_ONBOARDING_API_DID: Joi.string(),
    USERS_ONBOARDING_API_PRIVATE_KEY: Joi.string(),
    TRUSTED_HOSTNAMES: Joi.string(),
    TEST_CLIENT_KID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
    TEST_LB_DOMAIN: Joi.string().uri(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
