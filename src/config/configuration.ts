import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiName: string;
  authorisationApiUrl: string;
  ledgerApiName: string;
  ledgerApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  didRegistryApiUrl: string;
  contractAddr: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  testAdmin: {
    kid: string;
    privateKey: string;
  };
  testUser: {
    kid: string;
    privateKey: string;
  };
  testApp: {
    name: string;
    privateKey: string;
  };
  dockerContainerTag: string;
}

const AUTH_API_PATH = "/authorisation/v2";
const LEDGER_API_PATH = "/ledger/v3";
const DIDR_API_PATH = "/did-registry/v3";
const TAR_API_PATH = "/trusted-apps-registry/v3";
const HEALTH_CHECK_PATH = "/docs/";

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
    apiUrlPrefix: process.env.API_URL_PREFIX || "/timestamp/v3",
    apiName: process.env.API_NAME,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    testAdmin: {
      kid: process.env.TEST_ADMIN_KID,
      privateKey: process.env.TEST_ADMIN_PRIVATE_KEY,
    },
    testUser: {
      kid: process.env.TEST_USER_KID,
      privateKey: process.env.TEST_USER_PRIVATE_KEY,
    },
    testApp: {
      name: process.env.TEST_APP_NAME,
      privateKey: process.env.TEST_APP_PRIVATE_KEY,
    },
    dockerContainerTag,
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
    // Timestamp specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    AUTHORISATION_API_NAME: Joi.string(),
    LEDGER_API_NAME: Joi.string(),
    CONTRACT_ADDR: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
  }),
});
