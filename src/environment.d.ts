// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_KID: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      LOG_LEVEL?: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      // Ledger & SC
      LEDGER_API_URL?: string;
      LEDGER_API_NAME?: string;
      BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: string;
      // Authorisation API
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_URL?: string;
      // DID Registry API
      DID_REGISTRY_API_URL?: string;
      // Test vars
      TEST_ADMIN_DID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
    }
  }
}

export {};
