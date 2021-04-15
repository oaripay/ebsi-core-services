// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_NAME?: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      LEDGER?: string;
      TRUSTED_APPS_REGISTRY?: string;
      APPLICATION_ID: string;
      DOMAIN?: string;
      HEALTH_CHECK?: string;
      APP_TEST_NAME?: string;
      APP_TEST_PRIVATE_KEY?: string;
    }
  }
}

export {};
