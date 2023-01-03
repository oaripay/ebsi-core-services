// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_DID: string;
      API_ES256_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      OID_SCHEMA_PATTERN: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOCKER_TAG?: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      TEST_ENV?: string;
    }
  }
}

export {};
