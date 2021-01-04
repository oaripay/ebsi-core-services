import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  authExpireTime: number;
  contractAddr: string;
  domain: string;
  logLevel: string;
  ledger: string;
  adminTestPrivateKey: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.intebsi.xyz",
    LEDGER: "https://api.intebsi.xyz/ledger/v1",
    LOG_LEVEL: "debug",
  },
  integration: {
    DOMAIN: "https://api.intebsi.xyz",
    LEDGER: "https://api.intebsi.xyz/ledger/v1",
    LOG_LEVEL: "info",
  },
  development: {
    DOMAIN: "https://api.ebsi.xyz",
    LEDGER: "https://api.ebsi.xyz/ledger/v1",
    LOG_LEVEL: "warn",
  },
  production: {
    DOMAIN: "https://api.ebsi.xyz",
    LEDGER: "https://api.ebsi.xyz/ledger/v1",
    LOG_LEVEL: "error",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    adminTestPrivateKey: process.env.ADMIN_TEST_PRIVATE_KEY || "",
    authExpireTime: parseInt(process.env.AUTH_EXPIRE_TIME, 10) || 60, // minutes
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "",
    contractAddr: process.env.CONTRACT_ADDR,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    ledger: process.env.LEDGER || defaultConfig[EBSI_ENV].LEDGER,
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
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // TAR specific variables
    ADMIN_TEST_PRIVATE_KEY: Joi.string(),
    AUTH_EXPIRE_TIME: Joi.string(),
    DOMAIN: Joi.string().uri(),
    LEDGER: Joi.string().uri(),
  }),
});
