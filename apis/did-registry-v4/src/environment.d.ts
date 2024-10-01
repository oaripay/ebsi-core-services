import type { Network } from "@cef-ebsi/ebsi-uri";

// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOCKER_TAG?: string;
      BESU_RPC_NODE: string;
      BESU_READINESS_ENDPOINT: string;
      CONTRACT_ADDR: string;
      CONTRACT_V1_ADDR: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      NETWORK: Network;
      REQUEST_TIMEOUT?: string;
      AXIOS_RETRY_DELAY?: string;
      TRUSTED_HOSTNAMES?: string;
      TEST_AUTH_API_V3_ES256_PRIVATE_KEY?: string;
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
      TEST_SPECIFIC_NODE_DOMAIN?: string;
      BLOCKSCOUT_URL?: string;
      BLOCKSCOUT_BEARER_TOKEN?: string;
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
