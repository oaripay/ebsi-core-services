import type { Network } from "@cef-ebsi/ebsi-uri";

// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_ES256_PRIVATE_KEY: string;
      API_PRIVATE_KEY: string;
      API_NAME: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOCKER_TAG?: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      NETWORK: Network;
      TRUSTED_HOSTNAMES?: string;
      REQUEST_TIMEOUT?: string;
      AUTHORISATION_CREDENTIAL_SCHEMA: string;
      TNT_AUTHORISE_ISSUERS_ALLOWLIST?: string;
      TEST_ENV?: string;
      TEST_ISSUER_KID?: string;
      TEST_ISSUER_PRIVATE_KEY?: string;
      TEST_ISSUER_ALG?: string;
      TEST_ISSUER_ATTRIBUTE?: string;
      TEST_OID_SCHEMA_PATTERN?: string;
      TEST_TNT_AUTHORISED_USER_KID?: string;
      TEST_TNT_AUTHORISED_USER_PRIVATE_KEY?: string;
    }
  }
}

export {};
