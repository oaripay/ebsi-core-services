export default () => {
  const { EBSI_ENV } = process.env;

  const defaultConfig = {
    local: {
      WEB3_PROVIDER: "http://localhost:8545",
      CONTRACT_ADDR: "0xBCb85Ca4Cfb22dB204707778Ef513C8cEf9Dc894",
      LOG_LEVEL: "debug",
    },
    integration: {
      WEB3_PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      CONTRACT_ADDR: "0x0aF1B3F6e2B7512ae8E6ad5Ae415D18E1919A0FE",
      LOG_LEVEL: "debug",
    },
    development: {
      WEB3_PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      CONTRACT_ADDR: "0x4723D3AdC915D1bf65c0834Ce4CC21d2630cfd51",
      LOG_LEVEL: "debug",
    },
    production: {
      WEB3_PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      CONTRACT_ADDR: "0x4723D3AdC915D1bf65c0834Ce4CC21d2630cfd51",
      LOG_LEVEL: "warn",
    },
  };

  return {
    EBSI_ENV,
    API_PRIVATE_KEY: process.env.API_PRIVATE_KEY,
    API_PORT: process.env.API_PORT || 9000,
    LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    WEB3_PROVIDER:
      process.env.WEB3_PROVIDER || defaultConfig[EBSI_ENV].WEB3_PROVIDER,
    CONTRACT_ADDR:
      process.env.CONTRACT_ADDR || defaultConfig[EBSI_ENV].CONTRACT_ADDR,
    AUTH_EXPIRE_TIME: process.env.AUTH_EXPIRE_TIME || 60, // minutes
  };
};
