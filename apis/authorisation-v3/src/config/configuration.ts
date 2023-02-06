import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiDid: string;
  apiES256PrivateKey: string;
  apiUrlPrefix: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  externalEbsiApiHealthCheck: string;
  dockerContainerTag: string;
  // Test-specific variables
  testEnv?: string;
  testIssuerKid?: string;
  testIssuerPrivateKey?: string;
  testIssuerAlg?: string;
  testOidSchemaPattern: string;
}

const HEALTH_CHECK_PATH = "/docs/";

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiDid: process.env.API_DID,
    apiES256PrivateKey: process.env.API_ES256_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/authorisation/v3",
    logLevel: process.env.LOG_LEVEL || "warn",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    dockerContainerTag: process.env.DOCKER_TAG || "",
    // Test-specific variables
    testEnv: process.env.TEST_ENV,
    testIssuerKid: process.env.TEST_ISSUER_KID,
    testIssuerPrivateKey: process.env.TEST_ISSUER_PRIVATE_KEY,
    testIssuerAlg: process.env.TEST_ISSUER_ALG,
    testOidSchemaPattern: process.env.TEST_OID_SCHEMA_PATTERN,
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
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_DID: Joi.string().required(),
    API_ES256_PRIVATE_KEY: Joi.string().required(),
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
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    // Test-specific variables
    TEST_ENV: Joi.string(),
    TEST_ISSUER_KID: Joi.string(),
    TEST_ISSUER_PRIVATE_KEY: Joi.string(),
    TEST_ISSUER_ALG: Joi.string(),
    TEST_OID_SCHEMA_PATTERN: Joi.string(),
  }),
});
