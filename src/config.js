const { utils } = require("@cef-ebsi/app-jwt");
const { abi } = require("./sc-notary");
require("dotenv").config();

const API_NAME = "ebsi-ledger";
const DEFAULT_PAGE_SIZE = 10;

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

const sharedConfig = {
  trustedAppsRegistry: `${url}/trusted-apps-registry/v1`,
  didResolver: `${url}/did/v1/identifiers`,
  notary: {
    address: process.env.BESU_ADDRESS_NOTARY,
    abi,
  },
  privKey: utils.privateKeyAsJWK(process.env.API_PRIVATE_KEY),
};

module.exports = {
  ...sharedConfig,
  ...finalConfig,
  port,
  API_NAME,
  DEFAULT_PAGE_SIZE,
};
