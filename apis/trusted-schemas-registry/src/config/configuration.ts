import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  // Ledger & SC
  ledgerApiUrl: string;
  ledgerApiName: string;
  contractAddr: string;
  // Authorisation API
  authorisationApiUrl: string;
  // DID Registry API
  didRegistryApiUrl: string;
  // Trusted Apps Registry API
  tarApiUrl: string;
  // Test variables
  testAdminKid: string;
  testAdminPrivateKey: string;
  testVaSchemaUrl: string;
  dockerContainerTag: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "debug",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    LEDGER_API_URL: "https://api.conformance.intebsi.xyz/ledger/v3",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LOG_LEVEL: "warn",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v3",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    LOG_LEVEL: "error",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v3",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v3",
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
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-schemas-registry/v2",
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    // Ledger & SC
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    contractAddr: process.env.CONTRACT_ADDR,
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
    testVaSchemaUrl: process.env.TEST_VA_SCHEMA_URL,
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
    HEALTH_CHECK: Joi.string(),
    DOMAIN: Joi.string(),
    LOCAL_ORIGIN: Joi.string().uri(),
    REQUEST_TIMEOUT: Joi.string(),
    // Ledger & SC
    CONTRACT_ADDR: Joi.string().required(),
    LEDGER_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    // DID Registry API
    DID_REGISTRY_API_URL: Joi.string().uri(),
    // Trusted Apps Registry API
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string(),
    // Test vars
    TEST_ADMIN_KID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_VA_SCHEMA_URL: Joi.string(),
  }),
});
