import type { EbsiVpEnvConfiguration } from "@cef-ebsi/verifiable-presentation";

import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiES256PrivateKey: string;
  apiPort: number;
  apiUrlPrefix: string;
  dockerContainerTag: string;
  domain: string;
  ebsiEnvConfig: EbsiVpEnvConfiguration;
  localOrigin: string | undefined;
  logLevel: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
  // Test-specific variables
  testEnv: string | undefined;
  testIssuerAlg: string | undefined;
  testIssuerAttribute: string | undefined;
  testIssuerKid: string | undefined;
  testIssuerPrivateKey: string | undefined;
  testOidSchemaPattern: string | undefined;
  testSpecificNodeDomain: string | undefined;
}

export const SERVICE_PREFIX = "authorisation";
export const SERVICE_VERSION = "v3";

// EBSI Services Authorisation API v3 depends on
export const DEPENDENCIES = {
  "did-registry": "v4",
  "trusted-issuers-registry": "v4",
  "trusted-policies-registry": "v2",
  "trusted-schemas-registry": "v2",
} as const satisfies EbsiVpEnvConfiguration["services"];

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = () => {
  const { DOMAIN, URI_SCHEME } = process.env;

  const ebsiEnvConfig = {
    hosts: [
      DOMAIN.replace(/^https?:\/\//, ""), // remove http protocol scheme
    ],
    network: {
      isOptional: process.env.NETWORK === "production",
      name: process.env.NETWORK,
    },
    scheme: URI_SCHEME ?? "ebsi",
    services: DEPENDENCIES,
  } as const satisfies EbsiVpEnvConfiguration;

  return {
    apiES256PrivateKey: process.env.API_ES256_PRIVATE_KEY,
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: `/${SERVICE_PREFIX}/${SERVICE_VERSION}`,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    ebsiEnvConfig,
    localOrigin: process.env.LOCAL_ORIGIN,
    logLevel: process.env.LOG_LEVEL ?? "warn",
    // Test-specific variables
    testEnv: process.env.TEST_ENV,
    testIssuerAlg: process.env.TEST_ISSUER_ALG,
    testIssuerAttribute: process.env.TEST_ISSUER_ATTRIBUTE,
    testIssuerKid: process.env.TEST_ISSUER_KID,
    testIssuerPrivateKey: process.env.TEST_ISSUER_PRIVATE_KEY,
    testOidSchemaPattern: process.env.TEST_OID_SCHEMA_PATTERN,
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
  } as const satisfies ApiConfig;
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
    NETWORK: Joi.string().required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    // Test-specific variables
    TEST_ENV: Joi.string(),
    TEST_ISSUER_ALG: Joi.string(),
    TEST_ISSUER_ATTRIBUTE: Joi.string().uri(),
    TEST_ISSUER_KID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
    TEST_OID_SCHEMA_PATTERN: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    // Generic variables
    TZ: Joi.string(),
    // EBSI URI Scheme prefix
    URI_SCHEME: Joi.string(),
  }),
});
