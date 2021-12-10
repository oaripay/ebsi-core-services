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
  authorisationApiUrl: string;
  didRegistryApiUrl: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  // Ledger & SC
  ledgerApiUrl: string;
  ledgerApiName: string;
  contractAddr: string;
  // Tests
  testAdminDid: string;
  testAdminPrivateKey: string;
  testUserDid: string;
  testUserPrivateKey: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v2",
    LOG_LEVEL: "debug",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v2",
    LOG_LEVEL: "info",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v2",
    LEDGER_API_URL: "https://api.conformance.intebsi.xyz/ledger/v2",
    LOG_LEVEL: "info",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v2",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v2",
    LOG_LEVEL: "warn",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v2",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v2",
    LOG_LEVEL: "error",
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
    apiName: process.env.API_NAME || "trusted-policies-registry-api",
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-policies-registry/v1",
    authorisationApiDid: process.env.AUTHORISATION_API_DID,
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    // Ledger & SC
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    contractAddr: process.env.CONTRACT_ADDR,
    testAdminDid: process.env.TEST_ADMIN_DID || "",
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY || "",
    testUserDid: process.env.TEST_USER_DID || "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY || "",
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
    API_KID: Joi.string().uri().required(),
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string(),
    AUTHORISATION_API_DID: Joi.string().required(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    NOTIFICATIONS_API_URL: Joi.string().uri(),
    DID_REGISTRY_API_URL: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    // Ledger & SC
    CONTRACT_ADDR: Joi.string().required(),
    LEDGER_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    // Tests
    TEST_ADMIN_DID: Joi.string().allow(""),
    TEST_ADMIN_PRIVATE_KEY: Joi.string().allow(""),
    TEST_USER_DID: Joi.string().allow(""),
    TEST_USER_PRIVATE_KEY: Joi.string().allow(""),
  }),
});
