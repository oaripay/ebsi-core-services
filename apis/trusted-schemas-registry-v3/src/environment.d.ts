import type { Network } from "@cef-ebsi/ebsi-uri";

// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_PORT?: string;
      API_URL_PREFIX?: string;
      AXIOS_RETRY_DELAY?: string;
      BESU_READINESS_ENDPOINT: string;
      BESU_RPC_NODE: string;
      BLOCKSCOUT_BEARER_TOKEN?: string;
      BLOCKSCOUT_URL?: string;
      CONTRACT_ADDR: string;
      DOCKER_TAG?: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      LOG_LEVEL?: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
      NETWORK: Network;
      NODE_ENV: "development" | "production" | "test";
      REQUEST_TIMEOUT?: string;
      TEST_ADMIN_KID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
      TEST_ENABLE_WRITE_OPS?: string;
      TEST_ENV?: string;
      TEST_SPECIFIC_NODE_DOMAIN?: string;
      TEST_VA_SCHEMA?: string;
      TRUSTED_HOSTNAMES?: string;
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
