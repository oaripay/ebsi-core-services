// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PORT?: string;
      API_URL_PREFIX?: string;
      AUTHORISATION_API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOCKER_TAG?: string;
      BESU_RPC_NODE: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      TEST_USER_KID?: string;
      TEST_USER_PRIVATE_KEY?: string;
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
      TEST_ENV?: string;
      TEST_LB_DOMAIN?: string;
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
