import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  axiosRetryDelay: number;
  dockerContainerTag: string;
  domain: string;
  localOrigin: string | undefined;
  logLevel: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
  testSpecificNodeDomain: string | undefined;
  testUserDid: string;
}

export const SERVICE_PREFIX = "did-registry";
export const SERVICE_VERSION = "v6";

// EBSI Services that must be up and running before this service starts
export const BOOTSTRAP_DEPENDENCIES = {} as const;

// EBSI Services that must be up and running for this service to be considered healthy
export const RUNTIME_DEPENDENCIES = {} as const;

// EBSI Services that are only used during the tests
export const DEV_DEPENDENCIES = {} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = () => {
  const { DOMAIN } = process.env;

  return {
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: `/${SERVICE_PREFIX}/${SERVICE_VERSION}`,
    axiosRetryDelay: Number.parseInt(
      process.env.AXIOS_RETRY_DELAY ?? "10000",
      10,
    ),
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN,
    logLevel: process.env.LOG_LEVEL ?? "warn",
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    testUserDid: process.env.TEST_USER_DID ?? "",
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
    API_PORT: Joi.string().default("3000"),
    AXIOS_RETRY_DELAY: Joi.string(),
    DOCKER_TAG: Joi.string(),
    // DID Registry specific variables
    DOMAIN: Joi.string().uri().required(),
    GRAPHQL_ENDPOINT: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    NETWORK: Joi.string(),
    // Common API variables
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    TEST_ENV: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    TEST_USER_DID: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
