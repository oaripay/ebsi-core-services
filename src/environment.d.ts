// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_URL_ORIGIN?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      HEALTHCHECK_EBSI_API?: string;
      CASSANDRA_CONTACT_POINTS?: string;
      CASSANDRA_LOCAL_DATACENTER?: string;
      CASSANDRA_KEYSPACE?: string;
      CASSANDRA_CONSISTENCY_WRITE?:
        | "any"
        | "one"
        | "two"
        | "three"
        | "quorum"
        | "all"
        | "localQuorum"
        | "eachQuorum"
        | "localOne";
      CASSANDRA_CONSISTENCY_READ?:
        | "any"
        | "one"
        | "two"
        | "three"
        | "quorum"
        | "all"
        | "localQuorum"
        | "eachQuorum"
        | "localOne";
      CASSANDRA_USER: string;
      CASSANDRA_PASSWORD: string;
    }
  }
}

export {};
