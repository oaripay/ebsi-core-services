import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiKid: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiDid: string;
  authorisationApiName: string;
  authorisationApiUrl: string;
  contractAddr: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  ledgerApiUrl: string;
  ledgerApiName: string;
  externalEbsiApiHealthCheck: string;
  trustedAppsRegistryApiUrl: string;
  testAppName: string;
  testAppKid: string;
  testAppPrivateKey: string;
  testClientDid: string;
  testClientPrivateKey: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "debug",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v2",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LOG_LEVEL: "warn",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v2",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v1",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v2",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    LOG_LEVEL: "error",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v2",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v1",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiKid: process.env.API_KID,
    apiName: process.env.API_NAME || "did-registry-api",
    apiUrlPrefix: process.env.API_URL_PREFIX || "/did-registry/v2",
    authorisationApiDid: process.env.AUTHORISATION_API_DID,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    testAppName: process.env.TEST_APP_NAME,
    testAppKid: process.env.TEST_APP_KID,
    testAppPrivateKey: process.env.TEST_APP_PRIVATE_KEY,
    testClientDid: process.env.TEST_CLIENT_DID,
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY,
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
    EBSI_ENV: Joi.string().valid("local", "test", "pilot", "prod").required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string(),
    API_KID: Joi.string().uri().required(),
    API_NAME: Joi.string(),
    AUTHORISATION_API_DID: Joi.string().required(),
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // DID Registry specific variables
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LEDGER_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    HEALTH_CHECK: Joi.string(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_KID: Joi.string().uri(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_DID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
  }),
});
