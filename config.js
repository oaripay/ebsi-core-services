const utils = require("./utils");
require("dotenv").config();

const API_NAME = "ebsi-storage";

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

const environment = process.env.EBSI_ENV || "development";
const finalConfig = config[environment];
const { url } = finalConfig;

const sharedConfig = {
  trustedAppsRegistry: `${url}/trusted-apps-registry/v1`,
  mongodb: {
    connectionString: "mongodb://mongodb:27017/ebsi"
  },
  cassandra: {
    contactPoints: ["cassandradb"],
    localDataCenter: "datacenter1",
    keyspace: finalConfig.keyspace
  },
  glusterfs: {
    path: "/EBSI"
  },
  jwt: {
    privKey: utils.getJWKfromHex(process.env.API_STORAGE_PRIVATE_KEY),
  },
};

module.exports = {
  ...sharedConfig,
  ...finalConfig,
  port,
  API_NAME,
};
