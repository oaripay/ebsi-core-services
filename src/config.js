const { privateKeyAsJWK } = require("@cef-ebsi/app-jwt").default;
require("dotenv").config();

const API_NAME = "ebsi-storage";
const DEFAULT_PAGE_SIZE = 10;

const port = process.env.PORT || 8080;

const config = {
  production: {
    url: "https://api.ebsi.tech.ec.europa.eu",
    keyspace: "ebsi_production",
  },

  development: {
    url: "https://api.ebsi.xyz",
    keyspace: "ebsi_development",
  },

  integration: {
    url: "https://api.intebsi.xyz",
    keyspace: "ebsi_integration",
  },

  local: {
    url: "https://api.intebsi.xyz",
    keyspace: "ebsi_integration",
  },
};

if (!process.env.EBSI_ENV) throw new Error("EBSI_ENV is not defined");

const environment = process.env.EBSI_ENV;
const finalConfig = config[environment];
const { url } = finalConfig;

const sharedConfig = {
  trustedAppsRegistry: `${url}/trusted-apps-registry/v1`,
  cassandra: {
    connection: {
      contactPoints: ["cassandradb", "localhost"],
      localDataCenter: "datacenter1",
      keyspace: finalConfig.keyspace,
    },
    opts: {
      reconnectTries: Number.MAX_VALUE,
      reconnectInterval: 5000,
    },
  },
  privKey: privateKeyAsJWK(process.env.API_PRIVATE_KEY),
};

module.exports = {
  ...sharedConfig,
  ...finalConfig,
  port,
  API_NAME,
  DEFAULT_PAGE_SIZE,
};
