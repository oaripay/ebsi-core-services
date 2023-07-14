import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiName: string;
  apiES256PrivateKey: string;
  apiUrlPrefix: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  didRegistry: string;
  trustedIssuersRegistry: string;
  trustedAppsRegistry: string;
  trustedPoliciesRegistry: string;
  externalEbsiApiHealthCheck: string;
  dockerContainerTag: string;
  trustedHostnames: string[];
  requestTimeout: number;
  authorisationCredentialSchema: string;
  // Test-specific variables
  testEnv?: string;
  testIssuerKid?: string;
  testIssuerPrivateKey?: string;
  testIssuerAlg?: string;
  testIssuerAttribute?: string;
  testOidSchemaPattern: string;
}

const HEALTH_CHECK_PATH = "/docs/";
const DIDR_PATH = "/did-registry/v5/identifiers";
const TIR_PATH = "/trusted-issuers-registry/v5/issuers";
const TAR_PATH = "/trusted-apps-registry/v4/apps";
const TPR_PATH = "/trusted-policies-registry/v3";
const TSR_PATH = "/trusted-schemas-registry/v3/schemas";

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiES256PrivateKey: process.env.API_ES256_PRIVATE_KEY,
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/authorisation/v4",
    logLevel: process.env.LOG_LEVEL || "warn",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    didRegistry: DOMAIN + DIDR_PATH,
    trustedIssuersRegistry: DOMAIN + TIR_PATH,
    trustedAppsRegistry: DOMAIN + TAR_PATH,
    trustedPoliciesRegistry: DOMAIN + TPR_PATH,
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    dockerContainerTag: process.env.DOCKER_TAG || "",
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    authorisationCredentialSchema: `${DOMAIN}${TSR_PATH}/${process.env.AUTHORISATION_CREDENTIAL_SCHEMA}`,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    // Test-specific variables
    testEnv: process.env.TEST_ENV,
    testIssuerKid: process.env.TEST_ISSUER_KID,
    testIssuerPrivateKey: process.env.TEST_ISSUER_PRIVATE_KEY,
    testIssuerAlg: process.env.TEST_ISSUER_ALG,
    testIssuerAttribute: process.env.TEST_ISSUER_ATTRIBUTE,
    testOidSchemaPattern: process.env.TEST_OID_SCHEMA_PATTERN || "",
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
  validationSchema: Joi.object<typeof process.env, true>({
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_ES256_PRIVATE_KEY: Joi.string().required(),
    API_PRIVATE_KEY: Joi.string().required(),
    API_NAME: Joi.string().required(),
    API_URL_PREFIX: Joi.string(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    TRUSTED_HOSTNAMES: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    // Test-specific variables
    TEST_ENV: Joi.string(),
    TEST_ISSUER_KID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
    TEST_ISSUER_ALG: Joi.string(),
    TEST_ISSUER_ATTRIBUTE: Joi.string().uri(),
    TEST_OID_SCHEMA_PATTERN: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
