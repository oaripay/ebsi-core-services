import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  apiName: string;
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
  authorisationApiDid: string;
  authorisationApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  didRegistryApiUrl: string;
  testUser: {
    did: string;
    privateKey: string;
  };
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
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  conformance: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.conformance.intebsi.xyz",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v2",
    DID_REGISTRY_API_URL: "https://api.conformance.intebsi.xyz/did-registry/v2",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.preprod.ebsi.eu",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v1",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v2",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v2",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.ebsi.eu",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v1",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v2",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v2",
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
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiDid: process.env.AUTHORISATION_API_DID,
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    testUser: {
      did: process.env.TEST_USER_DID,
      privateKey: process.env.TEST_USER_PRIVATE_KEY,
    },
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
    EBSI_ENV: Joi.string()
      .valid("local", "test", "conformance", "pilot", "prod")
      .required(),
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
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string().uri(),
    DID_REGISTRY_API_URL: Joi.string().uri(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    TEST_USER_DID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_APP_ID: Joi.string(),
    TEST_APP_NAME: Joi.string(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
  }),
});
