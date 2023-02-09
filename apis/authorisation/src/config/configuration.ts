import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiName: string;
  apiUrlPrefix: string;
  onboardingAllowlist: string[];
  onboardingApiPrivateKey: string; // for tests
  trustedAppsRegistry: string;
  trustedIssuersRegistry: string;
  didRegistry: string;
  authorisationCredentialSchema: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
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
  testLoadBalancerDomain: string;
  dockerContainerTag: string;
}

const TAR_PATH = "/trusted-apps-registry/v3/apps";
const TIR_PATH = "/trusted-issuers-registry/v3/issuers";
const TSR_PATH = "/trusted-schemas-registry/v2/schemas";
const DIDR_PATH = "/did-registry/v4/identifiers";
const HEALTH_CHECK_PATH = "/docs/";

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/authorisation/v2",
    onboardingAllowlist: process.env.ONBOARDING_ALLOWLIST.split(","),
    onboardingApiPrivateKey: process.env.ONBOARDING_API_PRIVATE_KEY || "",
    trustedAppsRegistry: DOMAIN + TAR_PATH,
    trustedIssuersRegistry: DOMAIN + TIR_PATH,
    didRegistry: DOMAIN + DIDR_PATH,
    authorisationCredentialSchema: `${DOMAIN}${TSR_PATH}/${process.env.AUTHORISATION_CREDENTIAL_SCHEMA}`,
    logLevel: process.env.LOG_LEVEL || "warn",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
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
    testLoadBalancerDomain: process.env.TEST_LB_DOMAIN || "",
    dockerContainerTag: process.env.DOCKER_TAG || "",
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
    DOCKER_TAG: Joi.string(),
    // Authorisation specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    ONBOARDING_ALLOWLIST: Joi.string().required(),
    ONBOARDING_API_PRIVATE_KEY: Joi.string(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    REQUEST_TIMEOUT: Joi.string(),
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
    TEST_LB_DOMAIN: Joi.string().uri(),
  }),
});
