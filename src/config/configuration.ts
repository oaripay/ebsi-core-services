import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiKid: string;
  apiUrlPrefix: string;
  apiName: string;
  logLevel: string;
  domain: string;
  localOrigin: string;
  externalEbsiApiHealthCheck: string;
  // Ledger & SC
  ledgerApiUrl: string;
  ledgerApiName: string;
  besuTrustedIssuersRegistryAddress: string;
  // Authorisation API
  authorisationApiName: string;
  authorisationApiDid: string;
  authorisationApiUrl: string;
  // DID Registry API
  didRegistryApiUrl: string;
  // Test variables
  testAdminDid: string;
  testAdminPrivateKey: string;
  testUserDid: string;
  testUserPrivateKey: string;
}

const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LOG_LEVEL: "debug",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v2",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LOG_LEVEL: "info",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v2",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    LOG_LEVEL: "info",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    LEDGER_API_URL: "https://api.conformance.intebsi.xyz/ledger/v2",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v2",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    LOG_LEVEL: "warn",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v2",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v2",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    LOG_LEVEL: "error",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v2",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v1",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v2",
  },
};

export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-issuers-registry/v2",
    apiKid: process.env.API_KID,
    apiName: process.env.API_NAME || "trusted-issuers-registry-api",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    // Ledger & SC
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    besuTrustedIssuersRegistryAddress:
      process.env.BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    // Authorisation API
    authorisationApiDid: process.env.AUTHORISATION_API_DID,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    // DID Registry API
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    // Test vars
    testAdminDid: process.env.TEST_ADMIN_DID,
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY,
    testUserDid: process.env.TEST_USER_DID,
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY,
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
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    HEALTH_CHECK: Joi.string(),
    DOMAIN: Joi.string(),
    LOCAL_ORIGIN: Joi.string().uri(),
    // Ledger & SC
    BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: Joi.string().required(),
    LEDGER_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    // Authorisation API
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    AUTHORISATION_API_DID: Joi.string().required(),
    // DID Registry API
    DID_REGISTRY_API_URL: Joi.string().uri(),
    // Test vars
    TEST_ADMIN_DID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
  }),
});
