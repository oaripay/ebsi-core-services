import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  apiName: string;
  authorisationApiName: string;
  authorisationApiUrl: string;
  contractAddr: string;
  domain: string;
  ebsiEnv: "local" | "test" | "conformance" | "pilot" | "prod";
  localOrigin: string;
  logLevel: string;
  ledgerApiUrl: string;
  ledgerApiName: string;
  externalEbsiApiHealthCheck: string;
  requestTimeout: number;
  trustedAppsRegistryApiUrl: string;
  authorisationCredentialSchema: string;
  usersOnboardingApiDid: string;
  usersOnboardingApiPrivateKey: string;
  testAppKid: string;
  testAppPrivateKey: string;
  testClientKid: string;
  testClientPrivateKey: string;
  dockerContainerTag: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "debug",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    LEDGER_API_URL: "https://api.test.intebsi.xyz/ledger/v3",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.test.intebsi.xyz/authorisation/v2",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    LEDGER_API_URL: "https://api.conformance.intebsi.xyz/ledger/v3",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    LOG_LEVEL: "info",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3",
    AUTHORISATION_API_URL:
      "https://api.conformance.intebsi.xyz/authorisation/v2",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    LEDGER_API_URL: "https://api.preprod.ebsi.eu/ledger/v3",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    LOG_LEVEL: "warn",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.preprod.ebsi.eu/authorisation/v2",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    LEDGER_API_URL: "https://api.ebsi.eu/ledger/v3",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    LOG_LEVEL: "error",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v3",
    AUTHORISATION_API_URL: "https://api.ebsi.eu/authorisation/v2",
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
    apiName: process.env.API_NAME,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/did-registry/v3",
    authorisationApiName:
      process.env.AUTHORISATION_API_NAME || "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION_API_URL ||
      defaultConfig[EBSI_ENV].AUTHORISATION_API_URL,
    contractAddr: process.env.CONTRACT_ADDR,
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    ebsiEnv: EBSI_ENV,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    ledgerApiUrl:
      process.env.LEDGER_API_URL || defaultConfig[EBSI_ENV].LEDGER_API_URL,
    ledgerApiName: process.env.LEDGER_API_NAME || "ledger-api",
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    authorisationCredentialSchema:
      process.env.AUTHORISATION_CREDENTIAL_SCHEMA || "",
    usersOnboardingApiDid: process.env.USERS_ONBOARDING_API_DID || "",
    usersOnboardingApiPrivateKey:
      process.env.USERS_ONBOARDING_API_PRIVATE_KEY || "",
    testAppKid: process.env.TEST_APP_KID,
    testAppPrivateKey: process.env.TEST_APP_PRIVATE_KEY,
    testClientKid: process.env.TEST_CLIENT_KID,
    testClientPrivateKey: process.env.TEST_CLIENT_PRIVATE_KEY,
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
    AUTHORISATION_API_NAME: Joi.string(),
    AUTHORISATION_API_URL: Joi.string().uri(),
    TRUSTED_APPS_REGISTRY_API_URL: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug"
    ),
    // DID Registry specific variables
    DOMAIN: Joi.string().uri(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LEDGER_API_URL: Joi.string().uri(),
    LEDGER_API_NAME: Joi.string(),
    HEALTH_CHECK: Joi.string(),
    REQUEST_TIMEOUT: Joi.string(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string(),
    USERS_ONBOARDING_API_DID: Joi.string(),
    USERS_ONBOARDING_API_PRIVATE_KEY: Joi.string(),
    TEST_APP_KID: Joi.string().uri(),
    TEST_APP_PRIVATE_KEY: Joi.string(),
    TEST_CLIENT_KID: Joi.string(),
    TEST_CLIENT_PRIVATE_KEY: Joi.string(),
  }),
});
