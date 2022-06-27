import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  encryptionSecret: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiUrl: string;
  storageApiName: string;
  storageApiUrl: string;
  trustedAppsRegistryApiUrl: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  testUser1: {
    kid: string;
    privateKey: string;
  };
  testUser2: {
    kid: string;
    privateKey: string;
  };
  dockerContainerTag: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    STORAGE_API_URL: "https://api.test.intebsi.xyz/storage/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
    STORAGE_API_URL: "https://api.test.intebsi.xyz/storage/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    HEALTH_CHECK: `https://api.test.intebsi.xyz/docs/`,
  },
  conformance: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.conformance.intebsi.xyz",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
    STORAGE_API_URL: "https://api.conformance.intebsi.xyz/storage/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3",
    HEALTH_CHECK: `https://api.conformance.intebsi.xyz/docs/`,
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.pilot.ebsi.xyz",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
    STORAGE_API_URL: "https://api.preprod.ebsi.eu/storage/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3",
    HEALTH_CHECK: `https://api.preprod.ebsi.eu/docs/`,
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.prod.ebsi.xyz",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
    STORAGE_API_URL: "https://api.ebsi.eu/storage/v3",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v3",
    HEALTH_CHECK: `https://api.ebsi.eu/docs/`,
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/proxy-data-hub/v3",
    apiName: process.env.API_NAME,
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    storageApiName: process.env.STORAGE_API_NAME || "storage-api",
    storageApiUrl:
      process.env.STORAGE_API_URL || defaultConfig[EBSI_ENV].STORAGE_API_URL,
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    testUser1: {
      kid: process.env.TEST_USER_KID_1,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_1,
    },
    testUser2: {
      kid: process.env.TEST_USER_KID_2,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_2,
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
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // Proxy data hub specific variables
    ENCRYPTION_SECRET: Joi.string().required(),
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    STORAGE_API_NAME: Joi.string(),
    STORAGE_API_URL: Joi.string().uri(),
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    TEST_USER_KID_1: Joi.string(),
    TEST_USER_PRIVATE_KEY_1: Joi.string(),
    TEST_USER_KID_2: Joi.string(),
    TEST_USER_PRIVATE_KEY_2: Joi.string(),
  }),
});
