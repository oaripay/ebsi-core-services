// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      API_KID: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_DID?: string;
      AUTHORISATION_API_URL?: string;
      LEDGER_API_NAME?: string;
      LEDGER_API_URL?: string;
      TRUSTED_APPS_REGISTRY_API_URL?: string;
      DID_REGISTRY_API_URL?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      CONTRACT_ADDR: string;
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      TEST_ADMIN_DID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
      TEST_USER_DID?: string;
      TEST_USER_PRIVATE_KEY?: string;
    }
  }
}

export {};
