// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_ES256_PRIVATE_KEY: string;
      API_PORT?: string;
      DOCKER_TAG?: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      LOG_LEVEL?: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
      NETWORK: string;
      NODE_ENV: "development" | "production" | "test";
      TEST_ENV?: string;
      TEST_ISSUER_ALG?: string;
      TEST_ISSUER_ATTRIBUTE?: string;
      TEST_ISSUER_KID?: string;
      TEST_ISSUER_PRIVATE_KEY?: string;
      TEST_OID_SCHEMA_PATTERN?: string;
      TEST_SPECIFIC_NODE_DOMAIN?: string;
      URI_SCHEME?: string;
    }
  }
}

export {};
