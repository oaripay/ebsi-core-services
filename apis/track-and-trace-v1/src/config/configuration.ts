import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  logLevel: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
  domain: string;
  localOrigin: string;
  requestTimeout: number;
  axiosRetryDelay: number;
  // Ledger & SC
  ledgerApiUrl: string;
  ledgerApiName: string;
  contractAddr: string;
  // Authorisation API
  authorisationApiUrl: string;
  // Trusted Apps Registry API
  trustedAppsRegistryApiUrl: string;
  // Test variables
  dockerContainerTag: string;
}

const AUTH_API_PATH = "/authorisation/v4";
const LEDGER_API_PATH = "/ledger/v4";
const TAR_API_PATH = "/trusted-apps-registry/v4";

export const DEPENDENCIES = {
  "Authorisation API v4": AUTH_API_PATH,
  "Ledger API v4": LEDGER_API_PATH,
  "TAR API v4": TAR_API_PATH,
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
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    axiosRetryDelay: parseInt(process.env.AXIOS_RETRY_DELAY || "10000", 10),
    // Ledger & SC
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    contractAddr: process.env.CONTRACT_ADDR,
    // Authorisation API
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    // Trusted Apps Registry API
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    // Test variables
    dockerContainerTag: process.env.DOCKER_TAG || "",
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
    REQUEST_TIMEOUT: Joi.string(),
    AXIOS_RETRY_DELAY: Joi.string(),
    // Ledger & SC
    LEDGER_API_NAME: Joi.string(),
    CONTRACT_ADDR: Joi.string().required(),
    // Test variables
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
