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
      DOMAIN?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      BESU_RPC_NODE?: string;
      CONTRACT_ADDR: string;
      HEALTH_CHECK?: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_URL?: string;
      DID_REGISTRY_API_URL?: string;
      TEST_ADMIN_DID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
    }
  }
}

export {};
