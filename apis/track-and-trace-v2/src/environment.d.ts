import type { Network } from "@cef-ebsi/ebsi-uri";

// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
      DOMAIN: string;
      DOCKER_TAG?: string;
      LOCAL_ORIGIN?: string;
      NETWORK: Network;
      REQUEST_TIMEOUT?: string;
      AXIOS_RETRY_DELAY?: string;
      TRUSTED_HOSTNAMES?: string;
      // Ledger & SC
      BESU_RPC_NODE: string;
      BESU_READINESS_ENDPOINT: string;
      CONTRACT_ADDR: string;
      GRAPHQL_ENDPOINT: string;
      // Test variables
      TEST_AUTH_API_ES256_PRIVATE_KEY?: string;
      TEST_AUTHORISED_LEGAL_ENTITY_KID?: string;
      TEST_AUTHORISED_LEGAL_ENTITY_PRIVATE_KEY?: string;
      TEST_AUTHORISED_LEGAL_ENTITY_VC_TO_ONBOARD?: string;
      TEST_REGULAR_LEGAL_ENTITY_KID?: string;
      TEST_REGULAR_LEGAL_ENTITY_PRIVATE_KEY?: string;
      TEST_DOC_WITH_EVENTS?: string;
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
      TEST_SPECIFIC_NODE_DOMAIN?: string;
    }
  }

  // Avoid lint:tsc errors:
  // node_modules/hardhat/src/types/config.ts:273:11 - error TS2503: Cannot find namespace 'Mocha'.
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mocha/index.d.ts#L2276
  namespace Mocha {
    type MochaOptions = Record<string, unknown>;
  }
}

export {};
