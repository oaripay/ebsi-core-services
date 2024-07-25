import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { NETWORKS, type Network } from "@cef-ebsi/ebsi-uri";

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
  network: Network;
  didRegistry: string;
  trustedIssuersRegistry: string;
  trustedPoliciesRegistry: string;
  trackAndTraceAccessesEndpoint: string;
  dockerContainerTag: string;
  trustedHostnames: string[];
  requestTimeout: number;
  authorisationCredentialSchema: string;
  // Test-specific variables
  testEnv: string | undefined;
  testIssuerKid: string | undefined;
  testIssuerPrivateKey: string | undefined;
  testIssuerAlg: string | undefined;
  testIssuerAttribute: string | undefined;
  testOidSchemaPattern: string;
  testTntAuthorisedUserKid: string | undefined;
  testTntAuthorisedUserPrivateKey: string | undefined;
  testSpecificNodeDomain: string | undefined;
}

const DIDR_PATH = "/did-registry/v5";
const TIR_PATH = "/trusted-issuers-registry/v5";
const TPR_PATH = "/trusted-policies-registry/v3";
const TSR_PATH = "/trusted-schemas-registry/v3";
const TNT_PATH = "/track-and-trace/v1";

export const DEPENDENCIES = {
  "DIDR API v5": DIDR_PATH,
  "TIR API v5": TIR_PATH,
  "TPR API v3": TPR_PATH,
  "TSR API v3": TSR_PATH,
  "TNT API v1": TNT_PATH,
} as const;

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
    network: process.env.NETWORK,
    didRegistry: `${DOMAIN}${DIDR_PATH}/identifiers`,
    trustedIssuersRegistry: `${DOMAIN}${TIR_PATH}/issuers`,
    trustedPoliciesRegistry: `${DOMAIN}${TPR_PATH}/users`,
    trackAndTraceAccessesEndpoint: `${DOMAIN}${TNT_PATH}/accesses`,
    dockerContainerTag: process.env.DOCKER_TAG || "",
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES || "")
      .split(",")
      .filter(Boolean),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    // Test-specific variables
    authorisationCredentialSchema: `${DOMAIN}${TSR_PATH}/schemas/${process.env.AUTHORISATION_CREDENTIAL_SCHEMA}`,
    testEnv: process.env.TEST_ENV,
    testIssuerKid: process.env.TEST_ISSUER_KID,
    testIssuerPrivateKey: process.env.TEST_ISSUER_PRIVATE_KEY,
    testIssuerAlg: process.env.TEST_ISSUER_ALG,
    testIssuerAttribute: process.env.TEST_ISSUER_ATTRIBUTE,
    testOidSchemaPattern: process.env.TEST_OID_SCHEMA_PATTERN || "",
    testTntAuthorisedUserKid: process.env.TEST_TNT_AUTHORISED_USER_KID,
    testTntAuthorisedUserPrivateKey:
      process.env.TEST_TNT_AUTHORISED_USER_PRIVATE_KEY,
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
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
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    TRUSTED_HOSTNAMES: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    // Test-specific variables
    TEST_ENV: Joi.string(),
    TEST_ISSUER_KID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
    TEST_ISSUER_ALG: Joi.string(),
    TEST_ISSUER_ATTRIBUTE: Joi.string().uri(),
    TEST_OID_SCHEMA_PATTERN: Joi.string(),
    TEST_TNT_AUTHORISED_USER_KID: Joi.string(),
    TEST_TNT_AUTHORISED_USER_PRIVATE_KEY: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
