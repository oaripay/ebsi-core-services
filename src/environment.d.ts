// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "conformance" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_NAME: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      AUTHORISATION_API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      LEDGER_API_NAME?: string;
      CONTRACT_ADDR: string;
      DOMAIN: string;
      LOCAL_ORIGIN?: string;
      REQUEST_TIMEOUT?: string;
      AUTHORISATION_CREDENTIAL_SCHEMA?: string;
      USERS_ONBOARDING_API_DID?: string;
      USERS_ONBOARDING_API_PRIVATE_KEY?: string;
      TEST_CLIENT_KID?: string;
      TEST_CLIENT_PRIVATE_KEY?: string;
      TEST_ENV?: string;
      TEST_ENABLE_WRITE_OPS?: string;
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
