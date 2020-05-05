const utils = require("../src/utils");
const Server = require("../src/server");
require("dotenv").config();

const testMode = process.env.EBSI_TEST_MODE === "true";
const port = process.env.PORT || 8080;

const config = {
  production: {
    server: "https://api.ebsi.tech.ec.europa.eu",
  },
  development: {
    server: "https://api.ebsi.xyz",
  },
  integration: {
    server: "https://api.intebsi.xyz",
  },
  local: {},
};

if (!process.env.EBSI_ENV) throw new Error("EBSI_ENV is not defined");
if (!process.env.TEST_APP_NAME) throw new Error("TEST_APP_NAME is not defined");
if (!process.env.TEST_APP_PRIVATE_KEY)
  throw new Error("TEST_APP_PRIVATE_KEY is not defined");

const environment = process.env.EBSI_ENV;

let server;
if (environment === "local") {
  if (process.env.EBSI_API) server = process.env.EBSI_API;
  else server = new Server().start(port, testMode);
} else {
  server = config[environment].server;
}

const { TEST_APP_NAME } = process.env;
const privKey = utils.getJWKfromHex(process.env.TEST_APP_PRIVATE_KEY);

module.exports = {
  server,
  TEST_APP_NAME,
  privKey,
};
