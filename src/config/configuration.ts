import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiUrl: string;
  didRegistryApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  // Ledger & SC
  ledgerApiUrl: string;
  ledgerApiName: string;
  contractAddr: string;
  // Tests
  testAdminKid: string;
  testAdminPrivateKey: string;
  testUserKid: string;
  testUserPrivateKey: string;
  dockerContainerTag: string;
  blockscout: {
    url: string;
    bearerToken: string;
  };
}

const HEALTH_CHECK_PATH = "/docs/";
const AUTH_API_PATH = "/authorisation/v2";
const DIDR_API_PATH = "/did-registry/v3";
const LEDGER_API_PATH = "/ledger/v3";
const TAR_API_PATH = "/trusted-apps-registry/v3";

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
  },
  test: {
    LOG_LEVEL: "info",
  },
  conformance: {
    LOG_LEVEL: "info",
  },
  pilot: {
    LOG_LEVEL: "warn",
  },
  prod: {
    LOG_LEVEL: "error",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV, DOMAIN } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-policies-registry/v2",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    // Ledger & SC
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    contractAddr: process.env.CONTRACT_ADDR,
    testAdminKid: process.env.TEST_ADMIN_KID || "",
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY || "",
    testUserKid: process.env.TEST_USER_KID || "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY || "",
    dockerContainerTag,
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
    ".env.local",
    ".env",
  ],
  load: [loadConfig],
  validationSchema: Joi.object({
    // Common API variables
    EBSI_ENV: Joi.string()
      .valid("local", "test", "conformance", "pilot", "prod")
      .required(),
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
      "debug"
    ),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    REQUEST_TIMEOUT: Joi.string(),
    // Ledger & SC
    CONTRACT_ADDR: Joi.string().required(),
    LEDGER_API_NAME: Joi.string(),
    // Tests
    TEST_ADMIN_KID: Joi.string().allow(""),
    TEST_ADMIN_PRIVATE_KEY: Joi.string().allow(""),
    TEST_USER_KID: Joi.string().allow(""),
    TEST_USER_PRIVATE_KEY: Joi.string().allow(""),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
  }),
});
