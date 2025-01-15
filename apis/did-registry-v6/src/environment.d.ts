// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_PORT?: string;
      AXIOS_RETRY_DELAY?: string;
      DOCKER_TAG?: string;
      DOMAIN: string;
      GRAPHQL_ENDPOINT: string;
      LOCAL_ORIGIN?: string;
      LOG_LEVEL?: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
      NETWORK: string;
      NODE_ENV: "development" | "production" | "test";
      TEST_ENV?: string;
      TEST_SPECIFIC_NODE_DOMAIN?: string;
      TEST_USER_DID?: string;
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
