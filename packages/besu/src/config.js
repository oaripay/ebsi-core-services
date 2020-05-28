const utils = require("./utils");
const { abi } = require("./sc-notary");
require("dotenv").config();

const API_NAME = "ebsi-ledger";

const port = process.env.PORT || 8080;

const config = {
  production: {
    url: "https://api.ebsi.tech.ec.europa.eu",
    besuRPCNode: "https://www.ebsi.xyz/jsonrpc",
    keyspace: "ebsi_production",
  },

  development: {
    url: "https://api.ebsi.xyz",
    besuRPCNode: "https://www.ebsi.xyz/jsonrpc",
    keyspace: "ebsi_development",
  },

  integration: {
    url: "https://api.intebsi.xyz",
    besuRPCNode: "https://www.intebsi.xyz/jsonrpc",
    keyspace: "ebsi_integration",
  },

  local: {
    url: "https://api.intebsi.xyz",
    besuRPCNode: "https://www.intebsi.xyz/jsonrpc",
    keyspace: "ebsi_integration",
  },
};

const environment = process.env.EBSI_ENV || "development";
const finalConfig = config[environment];
const { url } = finalConfig;

if (!process.env.BESU_ADDRESS_NOTARY)
  throw new Error("BESU_ADDRESS_NOTARY is not defined");

if (!process.env.API_LEDGER_PRIVATE_KEY)
  throw new Error("API_LEDGER_PRIVATE_KEY is not defined");

const sharedConfig = {
  trustedAppsRegistry: `${url}/trusted-apps-registry/v1`,
  notary: {
    address: process.env.BESU_ADDRESS_NOTARY,
    abi,
  },
  privKey: process.env.API_LEDGER_PRIVATE_KEY,
  privKeyJWK: utils.getJWKfromHex(process.env.API_LEDGER_PRIVATE_KEY),
  testMode: process.env.EBSI_TEST_MODE === "true",
};

module.exports = {
  ...sharedConfig,
  ...finalConfig,
  port,
  API_NAME,
};
