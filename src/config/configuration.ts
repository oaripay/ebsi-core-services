import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

export interface ApiConfig {
  apiPrivateKey: string;
  apiPort: number;
  encryptionSecret: string;
  apiUrlPrefix: string;
  apiName: string;
  apiKid: string;
  authorisationApiName: string;
  authorisationApiDid: string;
  authorisationApiUrl: string;
  storageApiName: string;
  storageApiUrl: string;
  didRegistryApiUrl: string;
  domain: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  testUser1: {
    did: string;
    privateKey: string;
  };
  testUser2: {
    did: string;
    privateKey: string;
  };
}

// Default values to be used, depending on the environment
const defaultConfig = {
  local: {
    LOG_LEVEL: "debug",
    DOMAIN: "https://api.test.intebsi.xyz",
    API_URL_ORIGIN: "https://api.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    STORAGE_API_URL: "https://api.test.intebsi.xyz/storage/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
    HEALTH_CHECK: "https://api.intebsi.xyz/docs/",
  },
  test: {
    LOG_LEVEL: "info",
    DOMAIN: "https://api.test.intebsi.xyz",
    API_URL_ORIGIN: "https://api.test.intebsi.xyz",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v1",
    STORAGE_API_URL: "https://api.test.intebsi.xyz/storage/v2",
    DID_REGISTRY_API_URL: "https://api.test.intebsi.xyz/did-registry/v2",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
  },
  pilot: {
    LOG_LEVEL: "warn",
    DOMAIN: "https://api.pilot.ebsi.xyz",
    API_URL_ORIGIN: "https://api.preprod.ebsi.eu",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v1",
    STORAGE_API_URL: "https://api.preprod.ebsi.eu/storage/v2",
    DID_REGISTRY_API_URL: "https://api.preprod.ebsi.eu/did-registry/v2",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
  },
  prod: {
    LOG_LEVEL: "error",
    DOMAIN: "https://api.prod.ebsi.xyz",
    API_URL_ORIGIN: "https://api.ebsi.eu",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v1",
    STORAGE_API_URL: "https://api.ebsi.eu/storage/v2",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v2",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
  },
};

// Config factory
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    encryptionSecret: process.env.ENCRYPTION_SECRET,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/notifications/v1",
    apiName: process.env.API_NAME || "notifications-api",
    apiKid: process.env.API_KID,
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiDid: process.env.AUTHORISATION_API_DID,
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    storageApiName: process.env.STORAGE_API_NAME || "storage-api",
    storageApiUrl:
      process.env.STORAGE_API_URL || defaultConfig[EBSI_ENV].STORAGE_API_URL,
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    testUser1: {
      did: process.env.TEST_USER_DID_1,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_1,
    },
    testUser2: {
      did: process.env.TEST_USER_DID_2,
      privateKey: process.env.TEST_USER_PRIVATE_KEY_2,
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
    API_PRIVATE_KEY: Joi.string().required(),
    API_URL_PREFIX: Joi.string(),
    API_NAME: Joi.string(),
    API_KID: Joi.string().uri().required(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    ENCRYPTION_SECRET: Joi.string().required(),
    DOMAIN: Joi.string().uri(),
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_DID: Joi.string().required(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    STORAGE_API_NAME: Joi.string(),
    STORAGE_API_URL: Joi.string().uri(),
    DID_REGISTRY_API_URL: Joi.string().uri(),
    HEALTH_CHECK: Joi.string(),
    TEST_USER_DID_1: Joi.string(),
    TEST_USER_PRIVATE_KEY_1: Joi.string(),
    TEST_USER_DID_2: Joi.string(),
    TEST_USER_PRIVATE_KEY_2: Joi.string(),
  }),
});
