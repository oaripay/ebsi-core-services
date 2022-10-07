import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  encryptionSecret: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiUrl: string;
  storageApiName: string;
  storageApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  testUser1: {
    kid: string;
    privateKey: string;
  };
  testUser2: {
    kid: string;
    privateKey: string;
  };
  dockerContainerTag: string;
}

const AUTH_API_PATH = "/authorisation/v2";
const STORAGE_API_PATH = "/storage/v3";
const TAR_API_PATH = "/trusted-apps-registry/v3";
const HEALTH_CHECK_PATH = "/docs/";

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/proxy-data-hub/v3",
    apiName: process.env.API_NAME,
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    storageApiName: process.env.STORAGE_API_NAME || "storage-api",
    storageApiUrl: DOMAIN + STORAGE_API_PATH,
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || "warn",
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    testUser1: {
      kid: process.env.TEST_USER_KID_1,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_1,
    },
    testUser2: {
      kid: process.env.TEST_USER_KID_2,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_2,
    },
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
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    DOCKER_TAG: Joi.string(),
    // Proxy data hub specific variables
    ENCRYPTION_SECRET: Joi.string().required(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    STORAGE_API_NAME: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_USER_KID_1: Joi.string(),
    TEST_USER_PRIVATE_KEY_1: Joi.string(),
    TEST_USER_KID_2: Joi.string(),
    TEST_USER_PRIVATE_KEY_2: Joi.string(),
  }),
});
