export default () => {
  const { EBSI_ENV } = process.env;
  const defaultConfig = {
    local: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
      GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
      STORAGE: "https://api.ebsi.xyz/storage",
      LOG_LEVEL: "debug",
    },
    integration: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xcb29a1C8bf556047e164A51EB011B5b3047348f7",
      GOV_CONTRACT_ADDR: "0xCa5D58D19775dE8e14CF8a1aEeC880f7cC31f902",
      STORAGE: "https://api.intebsi.xyz/storage",
      LOG_LEVEL: "debug",
    },
    development: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
      GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
      STORAGE: "https://api.ebsi.xyz/storage",
      LOG_LEVEL: "debug",
    },
    production: {
      PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
      GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
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
    UNIV_CONTRACT_ADDR:
      process.env.UNIV_CONTRACT_ADDR ||
      defaultConfig[EBSI_ENV].UNIV_CONTRACT_ADDR,
    GOV_CONTRACT_ADDR:
      process.env.GOV_CONTRACT_ADDR ||
      defaultConfig[EBSI_ENV].GOV_CONTRACT_ADDR,
    STORAGE: process.env.STORAGE || defaultConfig[EBSI_ENV].STORAGE,
  };
};
