import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  contractAddr: string;
  domain: string;
  logLevel: string;
  ledger: string;
  adminTestPrivateKey: string;
  externalEbsiApiHealthCheck: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER: "https://api.test.intebsi.xyz/ledger/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "debug",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER: "https://api.test.intebsi.xyz/ledger/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    LEDGER: "https://api.preprod.ebsi.eu/ledger/v2",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LOG_LEVEL: "warn",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    LEDGER: "https://api.ebsi.eu/ledger/v2",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
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
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-apps-registry/v2",
    contractAddr: process.env.CONTRACT_ADDR,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    ledger: process.env.LEDGER || defaultConfig[EBSI_ENV].LEDGER,
    externalEbsiApiHealthCheck:
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
    // TAR specific variables
    ADMIN_TEST_PRIVATE_KEY: Joi.string(),
    DOMAIN: Joi.string().uri(),
    LEDGER: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
  }),
});
