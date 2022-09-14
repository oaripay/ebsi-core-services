// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_NAME?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      LEDGER_API_NAME?: string;
      REQUEST_TIMEOUT?: string;
      CONTRACT_ADDR: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      TEST_ADMIN_KID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
      TEST_VA_SCHEMA?: string;
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
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
