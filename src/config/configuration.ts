export default () => {
  const { EBSI_ENV } = process.env;
  const defaultConfig = {
    local: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      STORAGE: "https://api.ebsi.xyz/storage",
      LOG_LEVEL: "debug",
    },
    integration: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      STORAGE: "https://api.intebsi.xyz/storage",
      LOG_LEVEL: "debug",
    },
    development: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      STORAGE: "https://api.ebsi.xyz/storage",
      LOG_LEVEL: "debug",
    },
    production: {
      PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      STORAGE: "https://api.ebsi.xyz/storage",
      LOG_LEVEL: "warn",
    },
  };

  return {
    EBSI_ENV,
    API_PRIVATE_KEY: process.env.API_PRIVATE_KEY,
    APP_PORT: process.env.APP_PORT || 3000,
    LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    PROVIDER: process.env.PROVIDER || defaultConfig[EBSI_ENV].PROVIDER,
    UNIV_CONTRACT_ADDR: process.env.UNIV_CONTRACT_ADDR,
    GOV_CONTRACT_ADDR: process.env.GOV_CONTRACT_ADDR,
    STORAGE: process.env.STORAGE || defaultConfig[EBSI_ENV].STORAGE,
  };
};
