// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PORT?: string;
      API_PRIVATE_KEY: string;
      API_URL_PREFIX?: string;
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_URL?: string;
      DID_REGISTRY_API_URL?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      TEST_USER_DID?: string;
      TEST_USER_PRIVATE_KEY?: string;
    }
  }
}

export {};
