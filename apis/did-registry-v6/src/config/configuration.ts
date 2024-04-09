import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiUrl: string;
  contractAddr: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  ledgerApiUrl: string;
  ledgerApiName: string;
  requestTimeout: number;
  axiosRetryDelay: number;
  trustedAppsRegistryApiUrl: string;
  trustedHostnames: string[];
  testAuthApiV4ES256PrivateKey: string;
  testLoadBalancerDomain: string;
  dockerContainerTag: string;
  blockscout: {
    url: string;
    bearerToken: string;
  };
}

const AUTH_API_PATH = "/authorisation/v4";
const LEDGER_API_PATH = "/ledger/v4";
const TAR_API_PATH = "/trusted-apps-registry/v4";

export const DEPENDENCIES = {
  "Authorisation API v4": AUTH_API_PATH,
  "Ledger API v4": LEDGER_API_PATH,
  "TAR API v4": TAR_API_PATH,
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
    apiUrlPrefix: process.env.API_URL_PREFIX || "/did-registry/v6",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || "warn",
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    testAuthApiV4ES256PrivateKey:
      process.env.TEST_AUTH_API_V4_ES256_PRIVATE_KEY || "",
    testLoadBalancerDomain: process.env.TEST_LB_DOMAIN || "",
    dockerContainerTag: process.env.DOCKER_TAG || "",
    blockscout: {
      url: process.env.BLOCKSCOUT_URL || "",
      bearerToken: process.env.BLOCKSCOUT_BEARER_TOKEN || "",
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
    CONTRACT_ADDR: Joi.string().required(),
    // DID Registry specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    TRUSTED_HOSTNAMES: Joi.string(),
    TEST_AUTH_API_V4_ES256_PRIVATE_KEY: Joi.string(),
    TEST_LB_DOMAIN: Joi.string().uri(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
