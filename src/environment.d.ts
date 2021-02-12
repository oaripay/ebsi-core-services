// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PORT?: string;
      API_URL_PREFIX?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOMAIN?: string;
      HEALTH_CHECK?: string;
      CASSANDRA_USER: string;
      CASSANDRA_PASSWORD: string;
      CASSANDRA_CONSISTENCY_READ?:
        | "any"
        | "one"
        | "two"
        | "three"
        | "quorum"
        | "all"
        | "localQuorum"
        | "eachQuorum"
        | "serial"
        | "localSerial"
        | "localOne";
      CASSANDRA_CONSISTENCY_WRITE?:
        | "any"
        | "one"
        | "two"
        | "three"
        | "quorum"
        | "all"
        | "localQuorum"
        | "eachQuorum"
        | "serial"
        | "localSerial"
        | "localOne";
      CASSANDRA_CONTACT_POINTS?: string;
      CASSANDRA_LOCAL_DATACENTER?: string;
      CASSANDRA_KEYSPACE?: string;
    }
  }
}

export {};
