// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_KID: string;
      API_NAME?: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_URL?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      LEDGER_API_URL?: string;
      LEDGER_API_NAME?: string;
      CONTRACT_ADDR: string;
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      TRUSTED_APPS_REGISTRY_API_URL?: string;
      TRUSTED_ISSUERS_REGISTRY_API_URL?: string;
      AUTHORISATION_CREDENTIAL_SCHEMA?: string;
      USERS_ONBOARDING_API_DID?: string;
      USERS_ONBOARDING_API_PRIVATE_KEY?: string;
      TEST_APP_NAME?: string;
      TEST_APP_KID?: string;
      TEST_APP_PRIVATE_KEY?: string;
      TEST_CLIENT_DID?: string;
      TEST_CLIENT_PRIVATE_KEY?: string;
    }
  }
}

export {};
