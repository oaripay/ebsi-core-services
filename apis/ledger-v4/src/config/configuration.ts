import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  externalEbsiApiHealthCheck: string;
  besuRpcNode: string;
  domain: string;
  localOrigin: string;
  authorisationApiName: string;
  trustedAppsRegistryApiUrl: string;
  requestTimeout: number;
  testUser: {
    kid: string | undefined;
    privateKey: string | undefined;
  };
  testApp: {
    name: string | undefined;
    privateKey: string | undefined;
  };
  testLoadBalancerDomain: string;
  dockerContainerTag: string;
}

const TAR_API_PATH = "/trusted-apps-registry/v4";
const HEALTH_CHECK_PATH = "/docs/";

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/ledger/v4",
    logLevel: process.env.LOG_LEVEL || "warn",
    besuRpcNode: process.env.BESU_RPC_NODE,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    testUser: {
      kid: process.env.TEST_USER_KID,
      privateKey: process.env.TEST_USER_PRIVATE_KEY,
    },
    testApp: {
      name: process.env.TEST_APP_NAME,
      privateKey: process.env.TEST_APP_PRIVATE_KEY,
    },
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
  validationSchema: Joi.object<typeof process.env, true>({
    // Common API variables
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
    AUTHORISATION_API_NAME: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    BESU_RPC_NODE: Joi.string().uri().required(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_LB_DOMAIN: Joi.string().uri(),
    TEST_ENV: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
