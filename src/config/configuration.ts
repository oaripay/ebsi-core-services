export default () => {
  const { EBSI_ENV } = process.env;
  const defaultConfig = {
    local: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
      GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
      STORAGE: "https://api.ebsi.xyz/storage",
      MASTER_DIPLOMA:
        "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
      BACHELOR_DIPLOMA:
        "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968",
      TRUSTED_APP_REGISTRY: "https://api.intebsi.xyz/trusted-apps-registry",
      LOG_LEVEL: "debug"
    },
    integration: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xcb29a1C8bf556047e164A51EB011B5b3047348f7",
      GOV_CONTRACT_ADDR: "0xCa5D58D19775dE8e14CF8a1aEeC880f7cC31f902",
      STORAGE: "https://api.intebsi.xyz/storage",
      MASTER_DIPLOMA:
        "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
      BACHELOR_DIPLOMA:
        "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968",
      TRUSTED_APP_REGISTRY: "https://api.intebsi.xyz/trusted-apps-registry",
      LOG_LEVEL: "debug"
    },
    development: {
      PROVIDER: "https://www.intebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
      GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
      STORAGE: "https://api.ebsi.xyz/storage",
      MASTER_DIPLOMA:
        "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
      BACHELOR_DIPLOMA:
        "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968",
      TRUSTED_APP_REGISTRY: "https://api.intebsi.xyz/trusted-apps-registry",
      LOG_LEVEL: "debug"
    },
    production: {
      PROVIDER: "https://www.ebsi.xyz/jsonrpc",
      UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
      GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
      STORAGE: "https://api.ebsi.xyz/storage",
      MASTER_DIPLOMA:
        "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
      BACHELOR_DIPLOMA:
        "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968",
      TRUSTED_APP_REGISTRY: "https://api.ebsi.xyz/trusted-apps-registry",
      LOG_LEVEL: "warn"
    }
  };

  return {
    EBSI_ENV,
    APP_PRIVATE_KEY: process.env.APP_PRIVATE_KEY,
    APP_PORT: process.env.APP_PORT || 3000,
    LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig[EBSI_ENV].LOG_LEVEL,
    PROVIDER: process.env.PROVIDER || defaultConfig[EBSI_ENV].PROVIDER,
    UNIV_CONTRACT_ADDR:
      process.env.UNIV_CONTRACT_ADDR ||
      defaultConfig[EBSI_ENV].UNIV_CONTRACT_ADDR,
    GOV_CONTRACT_ADDR:
      process.env.GOV_CONTRACT_ADDR ||
      defaultConfig[EBSI_ENV].GOV_CONTRACT_ADDR,
    MASTER_DIPLOMA:
      process.env.MASTER_DIPLOMA || defaultConfig[EBSI_ENV].MASTER_DIPLOMA,
    BACHELOR_DIPLOMA:
      process.env.BACHELOR_DIPLOMA || defaultConfig[EBSI_ENV].BACHELOR_DIPLOMA,
    TRUSTED_APP_REGISTRY:
      process.env.TRUSTED_APP_REGISTRY ||
      defaultConfig[EBSI_ENV].TRUSTED_APP_REGISTRY,
    STORAGE: process.env.STORAGE || defaultConfig[EBSI_ENV].STORAGE
  };
};
