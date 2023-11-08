import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

export interface ApiConfig {
  apiPrivateKey: string;
  apiPort: number;
  encryptionSecret: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiUrl: string;
  storageApiName: string;
  storageApiUrl: string;
  didRegistryApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  domain: string;
  localOrigin: string;
  logLevel: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
  requestTimeout: number;
  testUser1: {
    kid: string | undefined;
    privateKey: string | undefined;
  };
  testUser2: {
    kid: string | undefined;
    privateKey: string | undefined;
  };
  testLoadBalancerDomain: string;
  dockerContainerTag: string;
}

const AUTH_API_PATH = "/authorisation/v2";
const DIDR_API_PATH = "/did-registry/v4";
const STORAGE_API_PATH = "/storage/v3";
const TAR_API_PATH = "/trusted-apps-registry/v3";

export const DEPENDENCIES = {
  "Authorisation API v2": AUTH_API_PATH,
  "DIDR API v4": DIDR_API_PATH,
  "Storage API v3": STORAGE_API_PATH,
  "TAR API v3": TAR_API_PATH,
} as const;

// Config factory
export const loadConfig = (): ApiConfig => {
  const { DOMAIN } = process.env;

  return {
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/notifications/v2",
    apiName: process.env.API_NAME,
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    storageApiName: process.env.STORAGE_API_NAME || "storage-api",
    storageApiUrl: DOMAIN + STORAGE_API_PATH,
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || "warn",
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    testUser1: {
      kid: process.env.TEST_USER_KID_1,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_1,
    },
    testUser2: {
      kid: process.env.TEST_USER_KID_2,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_2,
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
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    DOCKER_TAG: Joi.string(),
    ENCRYPTION_SECRET: Joi.string().required(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    STORAGE_API_NAME: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_USER_KID_1: Joi.string(),
    TEST_USER_PRIVATE_KEY_1: Joi.string(),
    TEST_USER_KID_2: Joi.string(),
    TEST_USER_PRIVATE_KEY_2: Joi.string(),
    TEST_LB_DOMAIN: Joi.string().uri(),
    TEST_ENV: Joi.string(),
    TEST_ENABLE_WRITE_OPS: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
