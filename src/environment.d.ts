// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      BESU_RPC_NODE?: string;
      CONTRACT_ADDR: string;
      DOMAIN?: string;
      ADMIN_TEST_PRIVATE_KEY?: string;
    }
  }
}

export {};
