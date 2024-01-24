// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME: string;
      LOG_LEVEL?: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
      DOMAIN: string;
      DOCKER_TAG?: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      AXIOS_RETRY_DELAY?: string;
      // Ledger & SC
      LEDGER_API_NAME?: string;
      CONTRACT_ADDR: string;
      // Test variables
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
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
