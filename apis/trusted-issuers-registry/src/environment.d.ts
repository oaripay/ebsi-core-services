// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      LOG_LEVEL?: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
      DOMAIN: string;
      DOCKER_TAG?: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      // Ledger & SC
      LEDGER_API_NAME?: string;
      BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS: string;
      // Test vars
      TEST_ADMIN_KID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
      TEST_USER_KID?: string;
      TEST_USER_PRIVATE_KEY?: string;
      TEST_ISSUER_WITH_PROXY_KID?: string;
      TEST_ISSUER_WITH_PROXY_PRIVATE_KEY?: string;
      TEST_STATUS_LIST_SCHEMA_ID?: string;
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
      TEST_LB_DOMAIN?: string;
      BLOCKSCOUT_URL?: string;
      BLOCKSCOUT_BEARER_TOKEN?: string;
    }
  }

  // Avoid lint:tsc errors:
  // node_modules/hardhat/src/types/config.ts:273:11 - error TS2503: Cannot find namespace 'Mocha'.
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mocha/index.d.ts#L2276
  namespace Mocha {
    interface MochaOptions {
      [x: string]: unknown;
    }
  }
}

export {};
