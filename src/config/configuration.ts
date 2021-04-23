import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  adminTestPrivateKey: string;
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  logLevel: string;
  domain: string;
  ledger: string;
  besuTrustedIssuersRegistryAddress: string;
  externalEbsiApiHealthCheck: string;
}

const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER: "https://api.test.intebsi.xyz/ledger/v2",
    LOG_LEVEL: "debug",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER: "https://api.test.intebsi.xyz/ledger/v2",
    LOG_LEVEL: "info",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    LEDGER: "https://api.preprod.ebsi.eu/ledger/v2",
    LOG_LEVEL: "warn",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    LEDGER: "https://api.ebsi.eu/ledger/v2",
    LOG_LEVEL: "error",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
  },
};

export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    adminTestPrivateKey: process.env.ADMIN_TEST_PRIVATE_KEY || "",
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-issuers-registry/v2",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    ledger: process.env.LEDGER || defaultConfig[EBSI_ENV].LEDGER,
    besuTrustedIssuersRegistryAddress:
      process.env.BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
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
    // TIR specific variables
    ADMIN_TEST_PRIVATE_KEY: Joi.string(),
    HEALTH_CHECK: Joi.string(),
    BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: Joi.string().required(),
    DOMAIN: Joi.string(),
    LEDGER: Joi.string(),
  }),
});
