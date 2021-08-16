// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_DID: string;
      API_TAR_ID: string;
      API_NAME?: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      ONBOARDING_ALLOWLIST: string;
      ONBOARDING_API_PRIVATE_KEY?: string;
      TRUSTED_APPS_REGISTRY?: string;
      TRUSTED_ISSUERS_REGISTRY?: string;
      DID_REGISTRY?: string;
      AUTHORISATION_CREDENTIAL_SCHEMA: string;
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
      TEST_CLIENT_DID?: string;
      TEST_CLIENT_PRIVATE_KEY?: string;
      TEST_ISSUER_DID?: string;
      TEST_ISSUER_PRIVATE_KEY?: string;
    }
  }
}

export {};
