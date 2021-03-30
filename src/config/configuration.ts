import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  encryptionSecret: string;
  apiUrlPrefix: string;
  domain: string;
  logLevel: string;
  storage: string;
  externalEBSIApiHealthCheck: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    STORAGE: "https://api.test.intebsi.xyz/storage/v2",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    STORAGE: "https://api.test.intebsi.xyz/storage/v2",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.pilot.ebsi.xyz",
    STORAGE: "https://api.pilot.ebsi.xyz/storage/v2",
    HEALTH_CHECK: `https://api.pilot.ebsi.xyz/docs/`,
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.prod.ebsi.xyz",
    STORAGE: "https://api.prod.ebsi.xyz/storage/v2",
    HEALTH_CHECK: `https://api.prod.ebsi.xyz/docs/`,
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/proxy-data-hub/v2",
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    storage: process.env.STORAGE || defaultConfig[EBSI_ENV].STORAGE,
    externalEBSIApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
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
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // Proxy data hub specific variables
    ENCRYPTION_SECRET: Joi.string().required(),
    DOMAIN: Joi.string().uri(),
    STORAGE: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
  }),
});
