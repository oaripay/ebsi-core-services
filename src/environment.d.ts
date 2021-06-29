// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      AUTHORISATION_API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      BESU_RPC_NODE: string;
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      TRUSTED_APPS_REGISTRY?: string;
      AUTHORISATION?: string;
      HEALTH_CHECK?: string;
      TEST_APP_ID?: string;
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
    }
  }
}

export {};
