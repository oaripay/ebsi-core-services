// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      ENCRYPTION_SECRET: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME: string;
      AUTHORISATION_API_URL?: string;
      STORAGE_API_NAME?: string;
      STORAGE_API_URL?: string;
      TRUSTED_APPS_REGISTRY_API_URL?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      TEST_USER_KID_1?: string;
      TEST_USER_PRIVATE_KEY_1?: string;
      TEST_USER_KID_2?: string;
      TEST_USER_PRIVATE_KEY_2?: string;
    }
  }
}

export {};
