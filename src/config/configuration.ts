import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  logLevel: string;
  domain: string;
  localOrigin: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  // Ledger & SC
  ledgerApiUrl: string;
  ledgerApiName: string;
  besuTrustedIssuersRegistryAddress: string;
  // Authorisation API
  authorisationApiUrl: string;
  // DID Registry API
  didRegistryApiUrl: string;
  // Trusted Apps Registry API
  tarApiUrl: string;
  // Test variables
  testAdminKid: string;
  testAdminPrivateKey: string;
  testUserKid: string;
  testUserPrivateKey: string;
  dockerContainerTag: string;
}

const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LOG_LEVEL: "debug",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LOG_LEVEL: "info",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    LOG_LEVEL: "info",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    LEDGER_API_URL: "https://api.conformance.intebsi.xyz/ledger/v3",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    LOG_LEVEL: "warn",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v3",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    LOG_LEVEL: "error",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v2",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v3",
  },
};

export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-issuers-registry/v3",
    apiName: process.env.API_NAME,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    // Ledger & SC
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    besuTrustedIssuersRegistryAddress:
      process.env.BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    // Authorisation API
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    // DID Registry API
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    // Trusted Apps Registry API
    tarApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    // Test vars
    testAdminKid: process.env.TEST_ADMIN_KID,
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY,
    testUserKid: process.env.TEST_USER_KID,
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY,
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
    HEALTH_CHECK: Joi.string(),
    DOMAIN: Joi.string(),
    LOCAL_ORIGIN: Joi.string().uri(),
    REQUEST_TIMEOUT: Joi.string(),
    // Ledger & SC
    BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: Joi.string().required(),
    LEDGER_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    // DID Registry API
    DID_REGISTRY_API_URL: Joi.string().uri(),
    // Trusted Apps Registry API
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string(),
    // Test vars
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
  }),
});
