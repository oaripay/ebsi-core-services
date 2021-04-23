import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

export interface ApiConfig {
  apiPrivateKey: string;
  apiPort: number;
  apiUrlPrefix: string;
  apiUrlOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  apiName: string;
  storage: string;
}

// Default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    API_URL_ORIGIN: "https://api.intebsi.xyz",
    HEALTH_CHECK: "https://api.intebsi.xyz/docs/",
    STORAGE: "https://api.test.intebsi.xyz/storage/v2",
  },
  test: {
    LOG_LEVEL: "info",
    API_URL_ORIGIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    STORAGE: "https://api.test.intebsi.xyz/storage/v2",
  },
  pilot: {
    LOG_LEVEL: "warn",
    API_URL_ORIGIN: "https://api.preprod.ebsi.eu",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    STORAGE: "https://api.preprod.ebsi.eu/storage/v2",
  },
  prod: {
    LOG_LEVEL: "error",
    API_URL_ORIGIN: "https://api.ebsi.eu",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    STORAGE: "https://api.ebsi.eu/storage/v2",
  },
};

// Config factory
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/notifications/v1",
    apiUrlOrigin:
      process.env.API_URL_ORIGIN || defaultConfig[EBSI_ENV].API_URL_ORIGIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    apiName: "ebsi-notifications",
    storage: process.env.STORAGE || defaultConfig[EBSI_ENV].STORAGE,
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
    API_URL_PREFIX: Joi.string(),
    API_URL_ORIGIN: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    HEALTH_CHECK: Joi.string(),
    STORAGE: Joi.string(),
  }),
});
