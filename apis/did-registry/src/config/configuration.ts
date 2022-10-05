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
  contractAddr: string;
  domain: string;
  ebsiEnv: "local" | "test" | "conformance" | "pilot" | "prod";
  localOrigin: string;
  logLevel: string;
  ledgerApiUrl: string;
  ledgerApiName: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  trustedAppsRegistryApiUrl: string;
  authorisationCredentialSchema: string;
  usersOnboardingApiDid: string;
  usersOnboardingApiPrivateKey: string;
  testClientKid: string;
  testClientPrivateKey: string;
  dockerContainerTag: string;
  blockscout: {
    url: string;
    bearerToken: string;
  };
}

const LEDGER_API_PATH = "/ledger/v3";
const TAR_API_PATH = "/trusted-apps-registry/v3";
const TSR_API_PATH = "/trusted-schemas-registry/v2";
const AUTH_API_PATH = "/authorisation/v2";
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
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/did-registry/v3",
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: DOMAIN,
    ebsiEnv: EBSI_ENV,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    ledgerApiUrl: DOMAIN + LEDGER_API_PATH,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    authorisationCredentialSchema: `${DOMAIN}${TSR_API_PATH}/schemas/${
      process.env.AUTHORISATION_CREDENTIAL_SCHEMA || ""
    }`,
    usersOnboardingApiDid: process.env.USERS_ONBOARDING_API_DID || "",
    usersOnboardingApiPrivateKey:
      process.env.USERS_ONBOARDING_API_PRIVATE_KEY || "",
    testClientKid: process.env.TEST_CLIENT_KID,
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY,
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
    ".env.default.local",
    ".env.default",
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
    AUTHORISATION_API_NAME: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // DID Registry specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string(),
    USERS_ONBOARDING_API_DID: Joi.string(),
    USERS_ONBOARDING_API_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_KID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
    BLOCKSCOUT_URL: Joi.string(),
    BLOCKSCOUT_BEARER_TOKEN: Joi.string(),
  }),
});
