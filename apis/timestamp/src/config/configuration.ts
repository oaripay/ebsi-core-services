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

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  conformance: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.conformance.intebsi.xyz",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
    LEDGER_API_URL: "https://api.conformance.intebsi.xyz/ledger/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v3",
    HEALTH_CHECK: `https://api.conformance.intebsi.xyz/docs/`,
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v3",
    HEALTH_CHECK: `https://api.preprod.ebsi.eu/docs/`,
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v3",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v3",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v3",
    HEALTH_CHECK: `https://api.ebsi.eu/docs/`,
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/timestamp/v3",
    apiName: process.env.API_NAME,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
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
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // Timestamp specific variables
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    LEDGER_API_URL: Joi.string().uri(),
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string().uri(),
    DID_REGISTRY_API_URL: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
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
