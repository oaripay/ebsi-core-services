import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

export interface ConfigObject {
  apiPrivateKey: string;
  apiPort: number;
  apiUrlPrefix: string;
  apiUrlOrigin: string;
  logLevel: string;
  healthcheckEbsiApi: string;
}

// Default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    API_URL_ORIGIN: "https://api.intebsi.xyz",
    HEALTHCHECK_EBSI_API: "https://api.intebsi.xyz/docs/",
  },
  integration: {
    LOG_LEVEL: "info",
    API_URL_ORIGIN: "https://api.intebsi.xyz",
    HEALTHCHECK_EBSI_API: "https://api.intebsi.xyz/docs/",
  },
  development: {
    LOG_LEVEL: "warn",
    API_URL_ORIGIN: "https://api.ebsi.xyz",
    HEALTHCHECK_EBSI_API: "https://api.ebsi.xyz/docs/",
  },
  production: {
    LOG_LEVEL: "error",
    API_URL_ORIGIN: "https://api.ebsi.xyz",
    HEALTHCHECK_EBSI_API: "https://api.ebsi.xyz/docs/",
  },
};

// Config factory
export const loadConfig = (): ConfigObject => {
  const { EBSI_ENV } = process.env;

  return {
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "",
    apiUrlOrigin:
      process.env.API_URL_ORIGIN || defaultConfig[EBSI_ENV].API_URL_ORIGIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    healthcheckEbsiApi:
      process.env.HEALTHCHECK_EBSI_API ||
      defaultConfig[EBSI_ENV].HEALTHCHECK_EBSI_API,
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
    EBSI_ENV: Joi.string()
      .valid("local", "integration", "development", "production")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string().required(),
    API_URL_ORIGIN: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    HEALTHCHECK_EBSI_API: Joi.string(),
  }),
});
