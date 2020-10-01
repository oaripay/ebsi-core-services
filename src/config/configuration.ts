import { ConfigModule } from "@nestjs/config";
import * as Joi from "@hapi/joi";
// List here all the values that will be returned by the config factory
interface ConfigObject {
  apiPrivateKey: string;
  adminTestPrivateKey: string;
  appPort: number;
  logLevel: string;
  provider: string;
  domain: string;
  ledger: string;
  besuTrustedIssuersRegistryAddress: string;
}

export const config = (): ConfigObject => {
  const { EBSI_ENV } = process.env;
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
  return {
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    adminTestPrivateKey: process.env.ADMIN_TEST_PRIVATE_KEY,
    appPort: parseInt(process.env.APP_PORT, 10),
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
  load: [config],
  validationSchema: Joi.object({
    EBSI_ENV: Joi.string()
      .valid("local", "integration", "development", "production")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PRIVATE_KEY: Joi.string().required(),
    APP_PORT: Joi.number().default(3000),
    LOG_LEVEL: Joi.string()
      .valid("error", "warn", "log", "verbose", "debug", "silent")
      .default("debug"),
  }),
});
