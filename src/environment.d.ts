// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      API_KID: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_URL?: string;
      STORAGE_API_NAME?: string;
      STORAGE_API_URL?: string;
      DID_REGISTRY_API_URL?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      ENCRYPTION_SECRET: string;
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      TEST_USER_DID_1?: string;
      TEST_USER_PRIVATE_KEY_1?: string;
      TEST_USER_DID_2?: string;
      TEST_USER_PRIVATE_KEY_2?: string;
    }
  }
}

export {};
