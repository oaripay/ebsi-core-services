// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PRIVATE_KEY: string;
      API_NAME: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOCKER_TAG?: string;
      ONBOARDING_ALLOWLIST: string;
      ONBOARDING_API_PRIVATE_KEY?: string;
      AUTHORISATION_CREDENTIAL_SCHEMA: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
      TEST_CLIENT_DID?: string;
      TEST_CLIENT_KID_ES256K?: string;
      TEST_CLIENT_KID_ES256?: string;
      TEST_CLIENT_KID_RS256?: string;
      TEST_CLIENT_KID_EDDSA?: string;
      TEST_CLIENT_PRIVATE_KEY?: string;
      TEST_ISSUER_DID?: string;
      TEST_ISSUER_PRIVATE_KEY?: string;
      TEST_ENV?: string;
      TEST_LB_DOMAIN?: string;
    }
  }
}

export {};
