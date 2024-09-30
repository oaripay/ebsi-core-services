import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  didRegistryApiUrl: string;
  contractAddr: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  besuRpcNode: string;
  besuReadinessEndpoint: string;
  requestTimeout: number;
  testSpecificNodeDomain: string | undefined;
  dockerContainerTag: string;
}

const DIDR_API_PATH = "/did-registry/v4";

export const DEPENDENCIES = {
  "DIDR API v4": DIDR_API_PATH,
} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/timestamp/v3",
    besuRpcNode: process.env.BESU_RPC_NODE,
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || "warn",
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
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
  validationSchema: Joi.object<typeof process.env, true>({
    // Common API variables
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    // Timestamp specific variables
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    BESU_RPC_NODE: Joi.string().uri().required(),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    CONTRACT_ADDR: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
