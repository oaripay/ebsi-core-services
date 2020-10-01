// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "integration" | "development" | "production";
      API_PRIVATE_KEY: string;
      APP_PORT?: string;
      LOG_LEVEL?: "error" | "warn" | "log" | "verbose" | "debug" | "silent";
    }
  }
}

export {};
