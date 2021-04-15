import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiName: string;
  apiUrlPrefix: string;
  authExpireTime: number;
  trustedAppsRegistry: string;
  applicationId: string;
  domain: string;
  logLevel: string;
  appTestName: string;
  appTestPrivateKey: string;
  externalEbsiApiHealthCheck: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    TRUSTED_APPS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: `https://api.preprod.ebsi.eu/docs/`,
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    TRUSTED_APPS_REGISTRY: "https://api.ebsi.eu/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: `https://api.ebsi.eu/docs/`,
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    authExpireTime: parseInt(process.env.AUTH_EXPIRE_TIME, 10) || 900, // seconds
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiName: process.env.API_NAME || "authorisation-api",
    apiUrlPrefix: process.env.API_URL_PREFIX || "/authorisation/v1",
    trustedAppsRegistry:
      process.env.TRUSTED_APPS_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY,
    applicationId: process.env.APPLICATION_ID,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    appTestName: process.env.APP_TEST_NAME || "",
    appTestPrivateKey: process.env.APP_TEST_PRIVATE_KEY || "",
  };
};

export const ApiConfigModule = ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    ".env.local",
    ".env",
  ],
  load: [loadConfig],
  validationSchema: Joi.object({
    // Common API variables
    EBSI_ENV: Joi.string().valid("local", "test", "pilot", "prod").required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_PRIVATE_KEY: Joi.string().required(),
    API_NAME: Joi.string(),
    API_URL_PREFIX: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // Authorisation specific variables
    DOMAIN: Joi.string().uri(),
    TRUSTED_APPS_REGISTRY: Joi.string(),
    APPLICATION_ID: Joi.string().required(),
    HEALTH_CHECK: Joi.string(),
    APP_TEST_NAME: Joi.string(),
    APP_TEST_PRIVATE_KEY: Joi.string(),
  }),
});
