// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
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
      API_PRIVATE_KEY: string;
      HEALTH_CHECK?: string;
      DID_RESOLVER?: string;
      TRUSTED_APPS_REGISTRY?: string;
      APPLICATION_ID?: string;
      APPLICATION_DID?: string;
      TEST_USER_DID?: string;
      TEST_USER_PRIVATE_KEY?: string;
      TEST_EU_LOGIN_USERNAME?: string;
      TEST_EU_LOGIN_PASSWORD?: string;
      TEST_RECAPTCHA_TOKEN?: string;
    }
  }
}

export {};
