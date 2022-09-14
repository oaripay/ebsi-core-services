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
  requestTimeout: number;
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

const HEALTH_CHECK_PATH = "/docs/";
const AUTH_API_PATH = "/authorisation/v2";
const TAR_API_PATH = "/trusted-apps-registry/v3/apps";
const DIDR_API_PATH = "/did-registry/v3/identifiers";
const TSR_API_PATH = "/trusted-schemas-registry/v2/schemas/";

// Example of default values to be used, depending on the environment
const defaultConfig = {
  local: {
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.acceptance.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "http://localhost:3000/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "localhost",
    LOG_LEVEL: "debug",
  },
  test: {
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.test.intebsi.xyz/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "intebsi.xyz",
    LOG_LEVEL: "info",
  },
  conformance: {
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.conformance.intebsi.xyz/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "intebsi.xyz",
    LOG_LEVEL: "info",
  },
  pilot: {
    EU_LOGIN_VALIDATE_SERVICE_URL:
      "https://ecas.ec.europa.eu/cas/TicketValidationService",
    EULOGIN_SERVICE_PARAM:
      "https://app.preprod.ebsi.eu/users-onboarding/v2/authentication",
    RECAPTCHA_REGISTERED_HOSTNAME: "ebsi.eu",
    LOG_LEVEL: "warn",
  },
  prod: {
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
  const { EBSI_ENV, DOMAIN } = process.env;
  const dockerContainerTag = getDockerTag(EBSI_ENV);

  return {
    apiPort: parseInt(process.env.API_PORT || "3000", 10),
    apiName: process.env.API_NAME,
    authorisationApiName: "authorisation-api",
    authorisationApiUrl: DOMAIN + AUTH_API_PATH,
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiUrlPrefix: process.env.API_URL_PREFIX || "/users-onboarding/v2",
    domain: DOMAIN,
    ebsiEnv: EBSI_ENV,
    localOrigin: process.env.LOCAL_ORIGIN || "",
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    externalEbsiApiHealthCheck: DOMAIN + HEALTH_CHECK_PATH,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    didRegistryApiUrl: DOMAIN + DIDR_API_PATH,
    trustedAppsRegistryApiUrl: DOMAIN + TAR_API_PATH,
    apiVerificationMethodKid: process.env.API_VERIFICATION_METHOD_KID,
    authorisationCredentialSchema:
      DOMAIN + TSR_API_PATH + process.env.AUTHORISATION_CREDENTIAL_SCHEMA,
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
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    REQUEST_TIMEOUT: Joi.string(),
    EU_LOGIN_VALIDATE_SERVICE_URL: Joi.string().uri(),
    RECAPTCHA_SERVICE_URL: Joi.string().uri(),
    RECAPTCHA_REGISTERED_HOSTNAME: Joi.string(),
    RECAPTCHA_API_KEY: Joi.string().required(),
    API_VERIFICATION_METHOD_KID: Joi.string().required(),
    AUTHORISATION_CREDENTIAL_SCHEMA: Joi.string().required(),
    TEST_USER_KID: Joi.string(),
    TEST_USER_PRIVATE_KEY: Joi.string(),
    TEST_EU_LOGIN_USERNAME: Joi.string(),
    TEST_EU_LOGIN_PASSWORD: Joi.string(),
    TEST_RECAPTCHA_TOKEN: Joi.string(),
  }),
});
