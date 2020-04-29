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

const environment = process.env.EBSI_ENV;
const finalConfig = config[environment];
const api = `${finalConfig.url}/timestamp/v1`;

module.exports = {
  api,
};
