import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { getDockerTag } from "../shared/utils";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  authorisationApiName: string;
  authorisationApiUrl: string;
  apiPort: number;
  apiName: string;
  apiVerificationMethodKid: string;
  apiPrivateKey: string;
  apiUrlPrefix: string;
  ebsiEnv: "local" | "test" | "conformance" | "pilot" | "prod";
  domain: string;
  localOrigin: string;
  logLevel: string;
  externalEbsiApiHealthCheck: string;
  trustedAppsRegistryApiUrl: string;
  didRegistryApiUrl: string;
  authorisationCredentialSchema: string;
  euloginService: string;
  euloginServiceParam: string;
  recaptchaService: string;
  recaptchaRegisteredHostname: string;
  recaptchaApiKey: string;
  testUserKid: string;
  testUserPrivateKey: string;
  testEuLoginUsername: string;
  testEuLoginPassword: string;
  testRecaptchaToken: string;
  dockerContainerTag: string;
}

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    AUTHORISATION: "https://api.test.intebsi.xyz/authorisation/v2",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3/apps",
    DID_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/did-registry/v3/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.acceptance.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "http://localhost:3000/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "localhost",
    LOG_LEVEL: "debug",
  },
  test: {
    DOMAIN: "https://api.test.intebsi.xyz",
    HEALTH_CHECK: "https://api.test.intebsi.xyz/docs/",
    AUTHORISATION: "https://api.test.intebsi.xyz/authorisation/v2",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/trusted-apps-registry/v3/apps",
    DID_REGISTRY_API_URL:
      "https://api.test.intebsi.xyz/did-registry/v3/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.test.intebsi.xyz/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "intebsi.xyz",
    LOG_LEVEL: "info",
  },
  conformance: {
    DOMAIN: "https://api.conformance.intebsi.xyz",
    HEALTH_CHECK: "https://api.conformance.intebsi.xyz/docs/",
    AUTHORISATION: "https://api.conformance.intebsi.xyz/authorisation/v2",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/trusted-apps-registry/v3/apps",
    DID_REGISTRY_API_URL:
      "https://api.conformance.intebsi.xyz/did-registry/v3/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.conformance.intebsi.xyz/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "intebsi.xyz",
    LOG_LEVEL: "info",
  },
  pilot: {
    DOMAIN: "https://api.preprod.ebsi.eu",
    HEALTH_CHECK: "https://api.preprod.ebsi.eu/docs/",
    AUTHORISATION: "https://api.preprod.ebsi.eu/authorisation/v2",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/trusted-apps-registry/v3/apps",
    DID_REGISTRY_API_URL:
      "https://api.preprod.ebsi.eu/did-registry/v3/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.preprod.ebsi.eu/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "ebsi.eu",
    LOG_LEVEL: "warn",
  },
  prod: {
    DOMAIN: "https://api.ebsi.eu",
    HEALTH_CHECK: "https://api.ebsi.eu/docs/",
    AUTHORISATION: "https://api.ebsi.eu/authorisation/v2",
    TRUSTED_APPS_REGISTRY_API_URL:
      "https://api.ebsi.eu/trusted-apps-registry/v3/apps",
    DID_REGISTRY_API_URL: "https://api.ebsi.eu/did-registry/v3/identifiers",
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.ebsi.eu/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "ebsi.eu",
    LOG_LEVEL: "error",
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
    apiName: process.env.API_NAME,
    authorisationApiName: "authorisation-api",
    authorisationApiUrl:
      process.env.AUTHORISATION || defaultConfig[EBSI_ENV].AUTHORISATION,
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/users-onboarding/v2",
    domain: process.env.DOMAIN || defaultConfig[EBSI_ENV].DOMAIN,
    ebsiEnv: EBSI_ENV,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck:
      process.env.HEALTH_CHECK || defaultConfig[EBSI_ENV].HEALTH_CHECK,
    didRegistryApiUrl:
      process.env.DID_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].DID_REGISTRY_API_URL,
    trustedAppsRegistryApiUrl:
      process.env.TRUSTED_APPS_REGISTRY_API_URL ||
      defaultConfig[EBSI_ENV].TRUSTED_APPS_REGISTRY_API_URL,
    apiVerificationMethodKid: process.env.API_VERIFICATION_METHOD_KID,
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
    testUserKid: process.env.TEST_USER_KID || "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY || "",
    testEuLoginUsername: process.env.TEST_EU_LOGIN_USERNAME,
    testEuLoginPassword: process.env.TEST_EU_LOGIN_PASSWORD,
    testRecaptchaToken: process.env.TEST_RECAPTCHA_TOKEN,
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
    API_PRIVATE_KEY: Joi.string().required(),
    API_NAME: Joi.string().required(),
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
    API_VERIFICATION_METHOD_KID: Joi.string().required(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_EU_LOGIN_USERNAME: Joi.string(),
    TEST_EU_LOGIN_PASSWORD: Joi.string(),
    TEST_RECAPTCHA_TOKEN: Joi.string(),
  }),
});
