var utils = require("./utils");
require("dotenv").config();

const BESU_API_NAME = "ebsi-besu";
const STORAGE_API_NAME = "ebsi-storage";

const port = process.env.PORT || 8080;

const config = {
  production: {
    url: "https://api.ebsi.tech.ec.europa.eu",
    besu_rpc_node: "https://www.ebsi.xyz/jsonrpc",
    keyspace: "ebsi_production"
  },

  development: {
    url: "https://api.ebsi.xyz",
    besu_rpc_node: "https://www.ebsi.xyz/jsonrpc",
    keyspace: "ebsi_development"
  },

  integration: {
    url: "https://api.intebsi.xyz",
    besu_rpc_node: "https://www.intebsi.xyz/jsonrpc",
    keyspace: "ebsi_integration"
  },

  local: {
    url: "https://api.intebsi.xyz",
    besu_rpc_node: "https://www.intebsi.xyz/jsonrpc",
    keyspace: "ebsi_integration"
  }
};

const environment = process.env.EBSI_ENV || "development";
var finalConfig = config[environment];
const url = finalConfig.url;

if (!process.env.BESU_ADDRESS_NOTARY)
  throw new Error("BESU_ADDRESS_NOTARY is not defined");

const sharedConfig = {
  apis: {
    besu: true,
    fileStorage: true,
    notary: true,
    walletRequestStorage: true,
    walletHistoricalStorage: true,
    keyValueStorage: true
  },
  ebsitrustedapp: url + "/ebsitrustedapp",
  trusted_issuers: url + "/trusted-issuers",
  notary: {
    address: process.env.BESU_ADDRESS_NOTARY,
    abi: require("./sc-notary").abi
  },
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
  jwt: {}
};

if (process.env.APIS === "ON")
  sharedConfig.apis = {
    besu: true,
    fileStorage: true,
    notary: true,
    walletRequestStorage: true,
    walletHistoricalStorage: true,
    keyValueStorage: true
  };
if (process.env.APIS === "OFF") sharedConfig.apis = {};

if (process.env.API_BESU === "ON") sharedConfig.apis.besu = true;
if (process.env.API_FABRIC === "ON") sharedConfig.apis.fabric = true;
if (process.env.API_FILE_STORAGE === "ON") sharedConfig.apis.fileStorage = true;
if (process.env.API_NOTARY === "ON") sharedConfig.apis.notary = true;
if (process.env.API_WALLET_REQUEST_STORAGE === "ON")
  sharedConfig.apis.walletRequestStorage = true;
if (process.env.API_WALLET_HISTORICAL_STORAGE === "ON")
  sharedConfig.apis.walletHistoricalStorage = true;
if (process.env.API_KEY_VALUE_STORAGE === "ON")
  sharedConfig.apis.keyValueStorage = true;

if (process.env.API_BESU === "OFF") delete sharedConfig.apis.besu;
if (process.env.API_FABRIC === "OFF") delete sharedConfig.apis.fabric;
if (process.env.API_FILE_STORAGE === "OFF")
  delete sharedConfig.apis.fileStorage;
if (process.env.API_NOTARY === "OFF") delete sharedConfig.apis.notary;
if (process.env.API_WALLET_REQUEST_STORAGE === "OFF")
  delete sharedConfig.apis.walletRequestStorage;
if (process.env.API_WALLET_HISTORICAL_STORAGE === "OFF")
  delete sharedConfig.apis.walletHistoricalStorage;
if (process.env.API_KEY_VALUE_STORAGE === "OFF")
  delete sharedConfig.apis.keyValueStorage;

if (!process.env.API_BESU_PRIVATE_KEY)
  throw new Error("API_BESU_PRIVATE_KEY is not defined");

if (!process.env.API_STORAGE_PRIVATE_KEY)
  throw new Error("API_STORAGE_PRIVATE_KEY is not defined");

sharedConfig.jwt[BESU_API_NAME] = {
  privKey: utils.getJWKfromHex(process.env.API_BESU_PRIVATE_KEY)
};

sharedConfig.jwt[STORAGE_API_NAME] = {
  privKey: utils.getJWKfromHex(process.env.API_STORAGE_PRIVATE_KEY)
};

module.exports = {
  ...sharedConfig,
  ...finalConfig,
  port,
  BESU_API_NAME,
  STORAGE_API_NAME
};
