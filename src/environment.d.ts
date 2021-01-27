// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "integration" | "development" | "production";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      LEDGER?: string;
      CONTRACT_ADDR: string;
      TRUSTED_APPS_REGISTRY_CONTRACT_ADDR: string;
      DOMAIN?: string;
      ADMIN_TEST_PRIVATE_KEY?: string;
      HEALTH_CHECK?: string;
    }
  }
}

export {};
