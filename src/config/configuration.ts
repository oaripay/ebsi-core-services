import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiName: string;
  apiUrlPrefix: string;
  ebsiEnv: "local" | "test" | "conformance" | "pilot" | "prod";
  onboardingAllowlist: string[];
  onboardingApiPrivateKey: string; // for tests
  trustedAppsRegistry: string;
  trustedIssuersRegistry: string;
  didRegistry: string;
  authorisationCredentialSchema: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  testAppName: string;
  testAppPrivateKey: string;
  testClientDid: string;
  testClientKidES256K: string;
  testClientKidES256: string;
  testClientKidRS256: string;
  testClientKidEdDSA: string;
  testClientPrivateKeysBase64: string;
  testIssuerDid: string;
  testIssuerPrivateKey: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-issuers-registry/v3/issuers",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    DID_REGISTRY: "https://api.test.intebsi.xyz/did-registry/v3/identifiers",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-issuers-registry/v3/issuers",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    DID_REGISTRY: "https://api.test.intebsi.xyz/did-registry/v3/identifiers",
  },
  conformance: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.conformance.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.conformance.intebsi.xyz/trusted-issuers-registry/v3/issuers",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    DID_REGISTRY:
      "https://api.conformance.intebsi.xyz/did-registry/v3/identifiers",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    TRUSTED_APPS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-issuers-registry/v3/issuers",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    DID_REGISTRY: "https://api.preprod.ebsi.eu/did-registry/v3/identifiers",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    TRUSTED_APPS_REGISTRY: "https://api.ebsi.eu/trusted-apps-registry/v3/apps",
    TRUSTED_ISSUERS_REGISTRY:
      "https://api.ebsi.eu/trusted-issuers-registry/v3/issuers",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    DID_REGISTRY: "https://api.ebsi.eu/did-registry/v3/identifiers",
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
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/authorisation/v2",
    ebsiEnv: EBSI_ENV,
    onboardingAllowlist: process.env.ONBOARDING_ALLOWLIST.split(","),
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
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    testAppName: process.env.TEST_APP_NAME || "",
    testAppPrivateKey: process.env.TEST_APP_PRIVATE_KEY || "",
    testClientDid: process.env.TEST_CLIENT_DID || "",
    testClientKidES256K: process.env.TEST_CLIENT_KID_ES256K || "",
    testClientKidES256: process.env.TEST_CLIENT_KID_ES256 || "",
    testClientKidRS256: process.env.TEST_CLIENT_KID_RS256 || "",
    testClientKidEdDSA: process.env.TEST_CLIENT_KID_EDDSA || "",
    testClientPrivateKeysBase64:
      process.env.TEST_CLIENT_PRIVATE_KEYS_BASE64 || "",
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
    EBSI_ENV: Joi.string()
      .valid("local", "test", "conformance", "pilot", "prod")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_PRIVATE_KEY: Joi.string().required(),
    API_NAME: Joi.string().required(),
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
    LOCAL_ORIGIN: Joi.string().uri(),
    ONBOARDING_ALLOWLIST: Joi.string().required(),
    ONBOARDING_API_PRIVATE_KEY: Joi.string(),
    TRUSTED_APPS_REGISTRY: Joi.string().uri(),
    TRUSTED_ISSUERS_REGISTRY: Joi.string().uri(),
    DID_REGISTRY: Joi.string().uri(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    HEALTH_CHECK: Joi.string().uri(),
    // Test specific variables
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_DID: Joi.string(),
    TEST_CLIENT_KID_ES256K: Joi.string(),
    TEST_CLIENT_KID_ES256: Joi.string(),
    TEST_CLIENT_KID_RS256: Joi.string(),
    TEST_CLIENT_KID_EDDSA: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
    TEST_ISSUER_DID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
  }),
});
