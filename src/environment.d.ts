// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME: string;
      STORAGE_API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      ENCRYPTION_SECRET: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      TEST_USER_KID_1?: string;
      TEST_USER_PRIVATE_KEY_1?: string;
      TEST_USER_KID_2?: string;
      TEST_USER_PRIVATE_KEY_2?: string;
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
    }
  }
}

export {};
