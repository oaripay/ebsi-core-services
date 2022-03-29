// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_URL?: string;
      LEDGER_API_NAME?: string;
      LEDGER_API_URL?: string;
      TRUSTED_APPS_REGISTRY_API_URL?: string;
      DID_REGISTRY_API_URL?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      CONTRACT_ADDR: string;
      DOMAIN?: string;
      LOCAL_ORIGIN?: string;
      HEALTH_CHECK?: string;
      TEST_ADMIN_KID?: string;
      TEST_ADMIN_PRIVATE_KEY?: string;
      TEST_USER_KID?: string;
      TEST_USER_PRIVATE_KEY?: string;
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
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
