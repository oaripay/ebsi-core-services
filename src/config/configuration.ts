import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiName: string;
  apiUrlPrefix: string;
  apiDid: string;
  apiTarId: string;
  authExpireTime: number;
  onboardingApiDid: string;
  onboardingApiPrivateKey: string; // for tests
  trustedAppsRegistry: string;
  trustedIssuersRegistry: string;
  didRegistry: string;
  authorisationCredentialSchema: string;
  domain: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  testAppName: string;
  testAppPrivateKey: string;
  testClientDid: string;
  testClientPrivateKey: string;
  testIssuerDid: string;
  testIssuerPrivateKey: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-issuers-registry/v2/issuers",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    DID_REGISTRY: "https://api.test.intebsi.xyz/did-registry/v2/identifiers",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-issuers-registry/v2/issuers",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    DID_REGISTRY: "https://api.test.intebsi.xyz/did-registry/v2/identifiers",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    TRUSTED_APPS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v2/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-issuers-registry/v2/issuers",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    DID_REGISTRY: "https://api.preprod.ebsi.eu/did-registry/v2/identifiers",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    TRUSTED_APPS_REGISTRY: "https://api.ebsi.eu/trusted-apps-registry/v2/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.ebsi.eu/trusted-issuers-registry/v2/issuers",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    DID_REGISTRY: "https://api.ebsi.eu/did-registry/v2/identifiers",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    authExpireTime: parseInt(process.env.AUTH_EXPIRE_TIME, 10) || 900, // seconds
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiName: process.env.API_NAME || "authorisation-api",
    apiUrlPrefix: process.env.API_URL_PREFIX || "/authorisation/v1",
    apiDid: process.env.API_DID,
    apiTarId: process.env.API_TAR_ID,
    onboardingApiDid: process.env.ONBOARDING_API_DID,
    onboardingApiPrivateKey: process.env.ONBOARDING_API_PRIVATE_KEY || "",
    trustedAppsRegistry:
      process.env.TRUSTED_APPS_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY,
    trustedIssuersRegistry:
      process.env.TRUSTED_ISSUERS_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_ISSUERS_REGISTRY,
    didRegistry:
      process.env.DID_REGISTRY || defaultConfig[EBSI_ENV].DID_REGISTRY,
    authorisationCredentialSchema: process.env.AUTHORISATION_CREDENTIAL_SCHEMA,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    testAppName: process.env.TEST_APP_NAME || "",
    testAppPrivateKey: process.env.TEST_APP_PRIVATE_KEY || "",
    testClientDid: process.env.TEST_CLIENT_DID || "",
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY || "",
    testIssuerDid: process.env.TEST_ISSUER_DID || "",
    testIssuerPrivateKey: process.env.TEST_ISSUER_PRIVATE_KEY || "",
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
    API_DID: Joi.string().required(),
    API_TAR_ID: Joi.string().required(),
    API_NAME: Joi.string(),
    API_URL_PREFIX: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // Authorisation specific variables
    DOMAIN: Joi.string().uri(),
    ONBOARDING_API_DID: Joi.string().required(),
    ONBOARDING_API_PRIVATE_KEY: Joi.string(),
    TRUSTED_APPS_REGISTRY: Joi.string().uri(),
    TRUSTED_ISSUERS_REGISTRY: Joi.string().uri(),
    DID_REGISTRY: Joi.string().uri(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    HEALTH_CHECK: Joi.string().uri(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_DID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
    TEST_ISSUER_DID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
  }),
});
