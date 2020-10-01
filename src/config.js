const { abi } = require("./sc-notary");
require("dotenv").config();

const port = process.env.PORT || 8080;
const maxBlockToParse = process.env.MAXIMUM_PAST_BLOCK_TO_PARSE || 20;
const DEFAULT_PAGE_SIZE = 10;

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
    url: "https://api.intebsi.xyz",
  },
};

const environment = process.env.EBSI_ENV || "development";
const finalConfig = config[environment];
const { url } = finalConfig;

if (!process.env.BESU_ADDRESS_NOTARY)
  throw new Error("BESU_ADDRESS_NOTARY is not defined");

const sharedConfig = {
  besuRPCNode: `${url}/ledger/v1/blockchains/besu`,
  notary: {
    address: process.env.BESU_ADDRESS_NOTARY,
    abi,
  },
};

module.exports = {
  ...sharedConfig,
  ...finalConfig,
  port,
  DEFAULT_PAGE_SIZE,
  maxBlockToParse,
};
