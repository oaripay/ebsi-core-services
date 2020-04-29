const utils = require("../utils");
require("dotenv").config();

const port = process.env.PORT || 8080;

const config = {
  production: {
    url: "https://api.ebsi.tech.ec.europa.eu",
  },
  development: {
    url: "https://api.ebsi.xyz",
  },
  integration: {
    url: "https://api.intebsi.xyz",
  },
  local: {
    url: process.env.EBSI_API || `http://localhost:${port}`,
  },
};

if (!process.env.EBSI_ENV) throw new Error("EBSI_ENV is not defined");
if (!process.env.TEST_APP_NAME) throw new Error("TEST_APP_NAME is not defined");
if (!process.env.TEST_APP_PRIVATE_KEY)
  throw new Error("TEST_APP_PRIVATE_KEY is not defined");

const environment = process.env.EBSI_ENV;
const finalConfig = config[environment];
const { TEST_APP_NAME } = process.env;
const privKey = utils.getJWKfromHex(process.env.TEST_APP_PRIVATE_KEY);
const api = `${finalConfig.url}/ledger/v1`;

module.exports = {
  api,
  TEST_APP_NAME,
  privKey,
};
