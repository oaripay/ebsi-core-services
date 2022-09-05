import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiName: string;
  authorisationApiUrl: string;
  contractAddr: string;
  didRegistryApiUrl: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  besuRpcNode: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  testAdminDid: string;
  testAdminPrivateKey: string;
  testUserDid: string;
  testUserPrivateKey: string;
  dockerContainerTag: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    BESU_RPC_NODE: "ws://www.test.intebsi.xyz/jsonrpc",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "debug",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    BESU_RPC_NODE: "ws://www.test.intebsi.xyz/jsonrpc",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v3",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    BESU_RPC_NODE: "ws://www.preprod.ebsi.eu/jsonrpc",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v3",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    BESU_RPC_NODE: "ws://www.preprod.ebsi.eu/jsonrpc",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LOG_LEVEL: "warn",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v3",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    BESU_RPC_NODE: "ws://www.ebsi.eu/jsonrpc",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    LOG_LEVEL: "error",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v3",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    // TAR API variables
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/trusted-apps-registry/v3",
    apiName: process.env.API_NAME || "trusted-apps-registry-api",
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    // Ledger & SC
    besuRpcNode:
      process.env.BESU_RPC_NODE || defaultConfig[EBSI_ENV].BESU_RPC_NODE,
    contractAddr: process.env.CONTRACT_ADDR,
    // Authorisation API
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    // DID Registry API
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    // Test variables
    testAdminDid: process.env.TEST_ADMIN_DID,
    testAdminPrivateKey: process.env.TEST_ADMIN_PRIVATE_KEY,
    testUserDid: process.env.TEST_USER_DID,
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY,
    dockerContainerTag,
  };
};

export const ApiConfigModule = ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    ".env.default.local",
    ".env.default",
  ],
  load: [loadConfig],
  validationSchema: Joi.object({
    // Common API variables
    EBSI_ENV: Joi.string()
      .valid("local", "test", "conformance", "pilot", "prod")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    // TAR specific variables
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    // Ledger
    BESU_RPC_NODE: Joi.string().uri(),
    CONTRACT_ADDR: Joi.string().required(),
    // Authorisation API
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    // DID Registry API
    DID_REGISTRY_API_URL: Joi.string().uri(),
    // Test vars
    TEST_ADMIN_DID: Joi.string(),
    TEST_ADMIN_PRIVATE_KEY: Joi.string(),
  }),
});
