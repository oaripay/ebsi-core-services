require("dotenv").config();

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
    url: process.env.EBSI_API,
  },
};

if (!process.env.EBSI_ENV) throw new Error("EBSI_ENV is not defined");

const environment = process.env.EBSI_ENV;
const finalConfig = config[environment];

module.exports = {
  ...finalConfig,
};
