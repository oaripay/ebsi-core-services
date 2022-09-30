import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
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
  authorisationApiName: string;
  authorisationApiUrl: string; // Only used in e2e tests
  trustedAppsRegistryApiUrl: string;
  requestTimeout: number;
  testUser: {
    kid: string;
    privateKey: string;
  };
  testApp: {
    name: string;
    privateKey: string;
  };
  dockerContainerTag: string;
}

const AUTH_API_URL = "/authorisation/v2";
const TAR_API_PATH = "/trusted-apps-registry/v3";
const HEALTH_CHECK_PATH = "/docs/";

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
  },
  test: {
    LOG_LEVEL: "info",
  },
  conformance: {
    LOG_LEVEL: "info",
  },
  pilot: {
    LOG_LEVEL: "warn",
  },
  prod: {
    LOG_LEVEL: "error",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV, DOMAIN } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiUrlPrefix: process.env.API_URL_PREFIX || "/ledger/v3",
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
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl: DOMAIN + AUTH_API_URL,
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    testUser: {
      kid: process.env.TEST_USER_KID,
      privateKey: process.env.TEST_USER_PRIVATE_KEY,
    },
    testApp: {
      name: process.env.TEST_APP_NAME,
      privateKey: process.env.TEST_APP_PRIVATE_KEY,
    },
    dockerContainerTag,
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
      .valid("local", "test", "conformance", "pilot", "prod")
      .required(),
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    API_PORT: Joi.string().default("3000"),
    API_URL_PREFIX: Joi.string(),
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
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
  }),
});
