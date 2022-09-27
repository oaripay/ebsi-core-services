// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PORT?: string;
      API_URL_PREFIX?: string;
      AUTHORISATION_API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      BESU_RPC_NODE: string;
      FABRIC_ENABLED?: string;
      FABRIC_USERNAME?: string;
      FABRIC_PASSWORD?: string;
      FABRIC_ADMIN_PEM_PRIVATE_KEY?: string;
      FABRIC_ADMIN_XPATH_PRIVATE_KEY?: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      TEST_USER_KID?: string;
      TEST_USER_PRIVATE_KEY?: string;
      TEST_APP_ID?: string;
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
      TEST_ENV?: string;
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
