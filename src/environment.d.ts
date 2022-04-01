// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_NAME: string;
      API_VERIFICATION_METHOD_KID: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      AUTHORISATION_CREDENTIAL_SCHEMA: string;
      EU_LOGIN_VALIDATE_SERVICE_URL?: string;
      RECAPTCHA_SERVICE_URL?: string;
      RECAPTCHA_REGISTERED_HOSTNAME?: string;
      RECAPTCHA_API_KEY: string;
      AUTHORISATION?: string;
      HEALTH_CHECK?: string;
      DID_REGISTRY_API_URL?: string;
      TRUSTED_APPS_REGISTRY_API_URL?: string;
      TEST_USER_KID?: string;
      TEST_USER_PRIVATE_KEY?: string;
      TEST_EU_LOGIN_USERNAME?: string;
      TEST_EU_LOGIN_PASSWORD?: string;
      TEST_RECAPTCHA_TOKEN?: string;
    }
  }
}

export {};
