import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  apiName: string;
  authApiName: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  besuRpcNode: string;
  fabric: {
    enabled: boolean;
    username: string;
    password: string;
    pem: string;
    xpath: string;
    chaincodeId: string;
  };
  domain: string;
  localOrigin: string;
  trustedAppsRegistry: string;
  authorisation: string;
  testApp: {
    id: string;
    name: string;
    privateKey: string;
  };
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION: "https://api.test.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION: "https://api.test.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    AUTHORISATION: "https://api.preprod.ebsi.eu/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    AUTHORISATION: "https://api.ebsi.eu/authorisation/v1",
    TRUSTED_APPS_REGISTRY: "https://api.ebsi.eu/trusted-apps-registry/v2/apps",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
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
    apiName: process.env.API_NAME || "ledger-api",
    authApiName: process.env.AUTHORISATION_API_NAME || "authorisation-api",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    besuRpcNode: process.env.BESU_RPC_NODE,
    fabric: {
      enabled: process.env.FABRIC_ENABLED === "true",
      username: process.env.FABRIC_USERNAME,
      password: process.env.FABRIC_PASSWORD,
      pem: process.env.FABRIC_ADMIN_PEM_PRIVATE_KEY,
      xpath: process.env.FABRIC_ADMIN_XPATH_PRIVATE_KEY,
      chaincodeId: "iossdrpociossvatid",
    },
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    trustedAppsRegistry:
      process.env.TRUSTED_APPS_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY,
    authorisation:
      process.env.AUTHORISATION || defaultConfig[EBSI_ENV].AUTHORISATION,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    testApp: {
      id: process.env.TEST_APP_ID,
      name: process.env.TEST_APP_NAME,
      privateKey: process.env.TEST_APP_PRIVATE_KEY,
    },
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
    API_NAME: Joi.string(),
    AUTHORISATION_API_NAME: Joi.string(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    BESU_RPC_NODE: Joi.string().uri().required(),
    FABRIC_ENABLED: Joi.string(),
    FABRIC_USERNAME: Joi.when("FABRIC_ENABLED", {
      is: "true",
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }),
    FABRIC_PASSWORD: Joi.when("FABRIC_ENABLED", {
      is: "true",
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }),
    FABRIC_ADMIN_PEM_PRIVATE_KEY: Joi.when("FABRIC_ENABLED", {
      is: "true",
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }),
    FABRIC_ADMIN_XPATH_PRIVATE_KEY: Joi.when("FABRIC_ENABLED", {
      is: "true",
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }),
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    TRUSTED_APPS_REGISTRY: Joi.string().uri(),
    AUTHORISATION: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    TEST_APP_ID: Joi.string(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
  }),
});
