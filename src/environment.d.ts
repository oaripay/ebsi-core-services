// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "integration" | "development" | "production";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
      ADMIN_TEST_PRIVATE_KEY?: string;
      BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: string;
      DOMAIN?: string;
      LEDGER?: string;
      PROVIDER?: string;
    }
  }
}

export {};
