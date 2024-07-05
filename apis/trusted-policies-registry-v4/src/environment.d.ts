import type { Network } from "@cef-ebsi/ebsi-uri";

// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PORT?: string;
      API_PRIVATE_KEY: string;
      API_NAME: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOCKER_TAG?: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      NETWORK: Network;
      TRUSTED_HOSTNAMES?: string;
      REQUEST_TIMEOUT?: string;
      AXIOS_RETRY_DELAY?: string;
      BESU_RPC_NODE: string;
      CONTRACT_ADDR: string;
      // Tests
      TEST_ADMIN_KID: string;
      TEST_ADMIN_PRIVATE_KEY: string;
      TEST_USER_KID: string;
      TEST_USER_PRIVATE_KEY: string;
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
