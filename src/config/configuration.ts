import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ConfigObject {
  adminTestPrivateKey: string;
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  logLevel: string;
  provider: string;
  domain: string;
  ledger: string;
  besuTrustedIssuersRegistryAddress: string;
}

const defaultConfig = {
  local: {
    PROVIDER: "https://www.intebsi.xyz/jsonrpc",
    DOMAIN: "https://api.intebsi.xyz",
    LEDGER: "https://api.intebsi.xyz/ledger/v1",
    LOG_LEVEL: "debug",
  },
  integration: {
    PROVIDER: "https://www.intebsi.xyz/jsonrpc",
    DOMAIN: "https://api.intebsi.xyz",
    LEDGER: "https://api.intebsi.xyz/ledger/v1",
    LOG_LEVEL: "debug",
  },
  development: {
    PROVIDER: "https://www.ebsi.xyz/jsonrpc",
    DOMAIN: "https://api.ebsi.xyz",
    LEDGER: "https://api.ebsi.xyz/ledger/v1",
    LOG_LEVEL: "debug",
  },
  production: {
    PROVIDER: "https://www.ebsi.xyz/jsonrpc",
    DOMAIN: "https://api.ebsi.xyz",
    LEDGER: "https://api.ebsi.xyz/ledger/v1",
    LOG_LEVEL: "warn",
  },
};

export const loadConfig = (): ConfigObject => {
  const { EBSI_ENV } = process.env;

  return {
    adminTestPrivateKey: process.env.ADMIN_TEST_PRIVATE_KEY || "",
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    provider: process.env.PROVIDER || defaultConfig[EBSI_ENV].PROVIDER,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    ledger: process.env.LEDGER || defaultConfig[EBSI_ENV].LEDGER,
    besuTrustedIssuersRegistryAddress:
      process.env.BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
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
    // TIR specific variables
    ADMIN_TEST_PRIVATE_KEY: Joi.string(),
    BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: Joi.string().required(),
    DOMAIN: Joi.string(),
    LEDGER: Joi.string(),
    PROVIDER: Joi.string(),
  }),
});
