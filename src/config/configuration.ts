export default () => {
  const { EBSI_ENV } = process.env;

  const defaultConfig = {
    local: {
      WEB3_PROVIDER: "http://localhost:8545",
      LOG_LEVEL: "debug",
    },
    integration: {
      WEB3_PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      LOG_LEVEL: "debug",
    },
    development: {
      WEB3_PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      LOG_LEVEL: "debug",
    },
    production: {
      WEB3_PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      LOG_LEVEL: "warn",
    },
  };

  return {
    EBSI_ENV,
    apiPrivateKey: process.env.API_PRIVATE_KEY,
    apiPort: parseInt(process.env.API_PORT, 10) || 9000,
    logLevel: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    web3Provider:
      process.env.WEB3_PROVIDER || defaultConfig[EBSI_ENV].WEB3_PROVIDER,
    contractAddr: process.env.CONTRACT_ADDR,
    authExpireTime: parseInt(process.env.AUTH_EXPIRE_TIME, 10) || 60, // minutes
  };
};
