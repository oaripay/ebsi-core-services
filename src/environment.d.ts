// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_KID: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      // Ledger & SC
      LEDGER_API_URL?: string;
      LEDGER_API_NAME?: string;
      CONTRACT_ADDR: string;
      // Authorisation API
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_URL?: string;
      // DID Registry API
      DID_REGISTRY_API_URL?: string;
      // TAR API
      TRUSTED_APPS_REGISTRY_API_URL?: string;
      // Test vars
      TEST_ADMIN_DID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
    }
  }
}

export {};
