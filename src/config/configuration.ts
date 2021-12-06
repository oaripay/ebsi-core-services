import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  authApiName: string;
  authorisationApiUrl: string;
  apiPort: number;
  apiName: string;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  trustedAppsRegistry: string;
  didResolver: string;
  applicationId: string;
  applicationDid: string;
  authorisationCredentialSchema: string;
  euloginService: string;
  euloginServiceParam: string;
  recaptchaService: string;
  recaptchaRegisteredHostname: string;
  recaptchaApiKey: string;
  testUserDid: string;
  testUserPrivateKey: string;
  testEuLoginUsername: string;
  testEuLoginPassword: string;
  testRecaptchaToken: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    AUTHORISATION: "https://api.test.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    DID_RESOLVER: "https://api.test.intebsi.xyz/did-registry/v2/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.acceptance.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "http://localhost:3000/users-onboarding/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "localhost",
    LOG_LEVEL: "debug",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    AUTHORISATION: "https://api.test.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
    DID_RESOLVER: "https://api.test.intebsi.xyz/did-registry/v2/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.test.intebsi.xyz/users-onboarding/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "intebsi.xyz",
    LOG_LEVEL: "info",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    AUTHORISATION: "https://api.conformance.intebsi.xyz/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v2/apps",
    DID_RESOLVER:
      "https://api.conformance.intebsi.xyz/did-registry/v2/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.conformance.intebsi.xyz/users-onboarding/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "intebsi.xyz",
    LOG_LEVEL: "info",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    AUTHORISATION: "https://api.preprod.ebsi.eu/authorisation/v1",
    TRUSTED_APPS_REGISTRY:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v2/apps",
    DID_RESOLVER: "https://api.preprod.ebsi.eu/did-registry/v2/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.preprod.ebsi.eu/users-onboarding/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "ebsi.eu",
    LOG_LEVEL: "warn",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    AUTHORISATION: "https://api.ebsi.eu/authorisation/v1",
    TRUSTED_APPS_REGISTRY: "https://api.ebsi.eu/trusted-apps-registry/v2/apps",
    DID_RESOLVER: "https://api.ebsi.eu/did-registry/v2/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.ebsi.eu/users-onboarding/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "ebsi.eu",
    LOG_LEVEL: "error",
  },
};

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = (): ApiConfig => {
  const { EBSI_ENV } = process.env;

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiName: "users-onboarding-api",
    authApiName: "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION || defaultConfig[EBSI_ENV].AUTHORISATION,
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/users-onboarding/v1",
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    didResolver:
      process.env.DID_RESOLVER || defaultConfig[EBSI_ENV].DID_RESOLVER,
    trustedAppsRegistry:
      process.env.TRUSTED_APPS_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY,
    applicationId: process.env.APPLICATION_ID,
    applicationDid: process.env.APPLICATION_DID,
    authorisationCredentialSchema: process.env.AUTHORISATION_CREDENTIAL_SCHEMA,
    euloginService:
      process.env.EU_LOGIN_VALIDATE_SERVICE_URL ||
      defaultConfig[EBSI_ENV].EU_LOGIN_VALIDATE_SERVICE_URL,
    euloginServiceParam: defaultConfig[EBSI_ENV].EULOGIN_SERVICE_PARAM,
    recaptchaService:
      process.env.RECAPTCHA_SERVICE_URL ||
      "https://www.google.com/recaptcha/api",
    recaptchaRegisteredHostname:
      process.env.RECAPTCHA_REGISTERED_HOSTNAME ||
      defaultConfig[EBSI_ENV].RECAPTCHA_REGISTERED_HOSTNAME,
    recaptchaApiKey: process.env.RECAPTCHA_API_KEY,
    testUserDid: process.env.TEST_USER_DID || "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY || "",
    testEuLoginUsername: process.env.TEST_EU_LOGIN_USERNAME,
    testEuLoginPassword: process.env.TEST_EU_LOGIN_PASSWORD,
    testRecaptchaToken: process.env.TEST_RECAPTCHA_TOKEN,
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
    EU_LOGIN_VALIDATE_SERVICE_URL: Joi.string().uri(),
    RECAPTCHA_SERVICE_URL: Joi.string().uri(),
    RECAPTCHA_REGISTERED_HOSTNAME: Joi.string(),
    RECAPTCHA_API_KEY: Joi.string().required(),
    HEALTH_CHECK: Joi.string(),
    API_PRIVATE_KEY: Joi.string().required(),
    APPLICATION_ID: Joi.string().required(),
    APPLICATION_DID: Joi.string().required(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    TEST_USER_DID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_EU_LOGIN_USERNAME: Joi.string(),
    TEST_EU_LOGIN_PASSWORD: Joi.string(),
    TEST_RECAPTCHA_TOKEN: Joi.string(),
  }),
});
