import { type Network, NETWORKS } from "@cef-ebsi/ebsi-uri";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiES256PrivateKey: string;
  apiPort: number;
  apiUrlPrefix: string;
  authorisationCredentialSchema: string;
  didRegistry: string;
  dockerContainerTag: string;
  domain: string;
  localOrigin: string;
  logLevel: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
  network: Network;
  requestTimeout: number;
  // Test-specific variables
  testEnv: string | undefined;
  testIssuerAlg: string | undefined;
  testIssuerAttribute: string | undefined;
  testIssuerKid: string | undefined;
  testIssuerPrivateKey: string | undefined;
  testOidSchemaPattern: string;
  testSpecificNodeDomain: string | undefined;
  testTntAuthorisedUserKid: string | undefined;
  testTntAuthorisedUserPrivateKey: string | undefined;
  trackAndTraceAccessesEndpoint: string;
  trustedHostnames: string[];
  trustedIssuersRegistry: string;
  trustedPoliciesRegistry: string;
}

const DIDR_PATH = "/did-registry/v6";
const TIR_PATH = "/trusted-issuers-registry/v6";
const TPR_PATH = "/trusted-policies-registry/v4";
const TSR_PATH = "/trusted-schemas-registry/v4";
const TNT_PATH = "/track-and-trace/v2";

export const DEPENDENCIES = {
  "DIDR API v6": DIDR_PATH,
  "TIR API v6": TIR_PATH,
  "TNT API v2": TNT_PATH,
  "TPR API v4": TPR_PATH,
  "TSR API v4": TSR_PATH,
} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiES256PrivateKey: process.env.API_ES256_PRIVATE_KEY,
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX ?? "/authorisation/v5",
    // Test-specific variables
    authorisationCredentialSchema: `${DOMAIN}${TSR_PATH}/schemas/${process.env.AUTHORISATION_CREDENTIAL_SCHEMA}`,
    didRegistry: `${DOMAIN}${DIDR_PATH}/identifiers`,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN ?? "",
    logLevel: process.env.LOG_LEVEL ?? "warn",
    network: process.env.NETWORK,
    requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT ?? "15000", 10),
    testEnv: process.env.TEST_ENV,
    testIssuerAlg: process.env.TEST_ISSUER_ALG,
    testIssuerAttribute: process.env.TEST_ISSUER_ATTRIBUTE,
    testIssuerKid: process.env.TEST_ISSUER_KID,
    testIssuerPrivateKey: process.env.TEST_ISSUER_PRIVATE_KEY,
    testOidSchemaPattern: process.env.TEST_OID_SCHEMA_PATTERN ?? "",
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    testTntAuthorisedUserKid: process.env.TEST_TNT_AUTHORISED_USER_KID,
    testTntAuthorisedUserPrivateKey:
      process.env.TEST_TNT_AUTHORISED_USER_PRIVATE_KEY,
    trackAndTraceAccessesEndpoint: `${DOMAIN}${TNT_PATH}/accesses`,
    trustedHostnames: (process.env.TRUSTED_HOSTNAMES ?? "")
      .split(",")
      .filter(Boolean),
    trustedIssuersRegistry: `${DOMAIN}${TIR_PATH}/issuers`,
    trustedPoliciesRegistry: `${DOMAIN}${TPR_PATH}/users`,
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
    API_ES256_PRIVATE_KEY: Joi.string().required(),
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    NETWORK: Joi.string()
      .valid(...NETWORKS)
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    REQUEST_TIMEOUT: Joi.string(),
    // Test-specific variables
    TEST_ENV: Joi.string(),
    TEST_ISSUER_ALG: Joi.string(),
    TEST_ISSUER_ATTRIBUTE: Joi.string().uri(),
    TEST_ISSUER_KID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
    TEST_OID_SCHEMA_PATTERN: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    TEST_TNT_AUTHORISED_USER_KID: Joi.string(),
    TEST_TNT_AUTHORISED_USER_PRIVATE_KEY: Joi.string(),
    TRUSTED_HOSTNAMES: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
