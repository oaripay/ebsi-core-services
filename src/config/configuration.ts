import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  besuRpcNode: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    BESU_RPC_NODE: "https://www.test.intebsi.xyz/jsonrpc",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  test: {
    LOG_LEVEL: "info",
    BESU_RPC_NODE: "https://www.test.intebsi.xyz/jsonrpc",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  pilot: {
    LOG_LEVEL: "warn",
    BESU_RPC_NODE: "https://www.pilot.intebsi.xyz/jsonrpc",
    HEALTH_CHECK: "https://api.pilot.ebsi.xyz/docs/",
  },
  prod: {
    LOG_LEVEL: "error",
    BESU_RPC_NODE: "https://www.prod.intebsi.xyz/jsonrpc",
    HEALTH_CHECK: "https://api.prod.ebsi.xyz/docs/",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/ledger/v2",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    besuRpcNode:
      process.env.BESU_RPC_NODE || defaultConfig[EBSI_ENV].BESU_RPC_NODE,
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
    API_URL_PREFIX: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    BESU_RPC_NODE: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
  }),
});
