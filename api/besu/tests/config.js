var utils = require("../utils");
require("dotenv").config();

const port = process.env.PORT || 8080;

const config = {
  production: {
    url: "https://api.ebsi.tech.ec.europa.eu"
  },
  development: {
    url: "https://api.ebsi.xyz"
  },
  integration: {
    url: "https://api.intebsi.xyz"
  },
  local: {
    url: "http://localhost:" + port
  }
};

const environment = process.env.EBSI_ENV || "development";
var finalConfig = config[environment];

const url = finalConfig.url;

const api = {
  besu: url + "/blockchain/besu",
  fileStorage: url + "/file-storage",
  notary: url + "/notary",
  walletRequestStorage: url + "/wallet-request-storage",
  walletHistoricalStorage: url + "/wallet-historical-storage",
  keyValueStorage: url + "/key-value-storage"
};

if (process.env.TEST_API) finalConfig.api = process.env.TEST_API;

module.exports = {
  ...finalConfig,
  api,
  private_key: utils.getJWKfromHex(process.env.TEST_APP_PRIVATE_KEY),
  app_name: process.env.TEST_APP_NAME
};
