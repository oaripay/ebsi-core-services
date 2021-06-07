// Provide typings for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      EBSI_ENV: "local" | "test" | "pilot" | "prod";
      API_PRIVATE_KEY: string;
      API_PORT?: string;
      API_URL_PREFIX?: string;
      API_NAME?: string;
      LOG_LEVEL?: "silent" | "error" | "warn" | "info" | "verbose" | "debug";
      DOMAIN?: string;
      HEALTH_CHECK?: string;
      ENCRYPTION_SECRET: string;
      // Authorisation API
      AUTHORISATION_API_DID: string;
      AUTHORISATION_API_NAME?: string;
      AUTHORISATION_API_URL?: string;
      // DID Registry API
      DID_REGISTRY_API_URL?: string;
      // TAR API
      TRUSTED_APPS_REGISTRY?: string;
      // Test vars
      TEST_APP_NAME?: string;
      TEST_APP_PRIVATE_KEY?: string;
      TEST_APP_KID?: string;
      TEST_CLIENT_DID?: string;
      TEST_CLIENT_PRIVATE_KEY?: string;
      // Cassandra
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
