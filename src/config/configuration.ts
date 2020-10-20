import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { abi } from "./sc-notary.json";
// List here all the values that will be returned by the config factory
export interface ConfigObject {
  besuRPCNode: string;
  besuAddressNotary: string;
  besuNotaryAbi: Array<unknown>;
  apiPort: number;
  defaultPageSize: number;
  apiUrl: string;
  externalEBSIApiUrl: string;
  externalEBSIApiHealthCheck: string;
  logLevel: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    url: "https://api.intebsi.xyz",
    healthCheck: `https://api.intebsi.xyz/docs/`,
  },
  integration: {
    LOG_LEVEL: "info",
    url: "https://api.intebsi.xyz",
    healthCheck: `https://api.intebsi.xyz/docs/`,
  },
  development: {
    LOG_LEVEL: "warn",
    url: "https://api.ebsi.xyz",
    healthCheck: `https://api.ebsi.xyz/docs/`,
  },
  production: {
    LOG_LEVEL: "error",
    url: "https://api.ebsi.tech.ec.europa.eu",
    healthCheck: `https://api.ebsi.xyz/docs/`,
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const configuration = (): ConfigObject => {
  const environment = process.env.EBSI_ENV || "development";
  const { url, LOG_LEVEL, healthCheck } = defaultConfig[environment];
  return {
    besuRPCNode: `${url}/ledger/v1/blockchains/besu`,
    besuAddressNotary: process.env.BESU_ADDRESS_NOTARY,
    besuNotaryAbi: abi,
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    defaultPageSize: 10,
    apiUrl: process.env.API_URL || "",
    externalEBSIApiUrl: url,
    externalEBSIApiHealthCheck: healthCheck,
    logLevel: process.env.LOG_LEVEL || LOG_LEVEL,
  };
};

export const ApiConfigModule = ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    ".env.local",
    ".env",
  ],
  load: [configuration],
  validationSchema: Joi.object({
    EBSI_ENV: Joi.string()
      .valid("local", "integration", "development", "production")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    BESU_ADDRESS_NOTARY: Joi.string().required(),
    API_PORT: Joi.string().default("3000"),
    API_URL: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
  }),
});
