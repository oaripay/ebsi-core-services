import * as dotenv from "dotenv";

dotenv.config();

const prodConfig = {
  PROVIDER: "https://www.intebsi.xyz/jsonrpc",
  // WALLET_PRIV_KEY: '...',
  UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
  GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
  STORAGE: "https://api.ebsi.xyz/storage",
  MASTER_DIPLOMA:
    "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
  BACHELOR_DIPLOMA:
    "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968"
};

const devConfig = {
  PROVIDER: "https://www.intebsi.xyz/jsonrpc",
  // WALLET_PRIV_KEY: '...',
  UNIV_CONTRACT_ADDR: "0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1",
  GOV_CONTRACT_ADDR: "0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78",
  STORAGE: "https://api.ebsi.xyz/storage",
  MASTER_DIPLOMA:
    "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
  BACHELOR_DIPLOMA:
    "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968",

  APP_PORT: 9000
};

const intConfig = {
  PROVIDER: "https://www.intebsi.xyz/jsonrpc",
  // WALLET_PRIV_KEY: '...',
  UNIV_CONTRACT_ADDR: "0xcb29a1C8bf556047e164A51EB011B5b3047348f7",
  GOV_CONTRACT_ADDR: "0xCa5D58D19775dE8e14CF8a1aEeC880f7cC31f902",
  STORAGE: "https://api.intebsi.xyz/storage",
  MASTER_DIPLOMA:
    "0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11",
  BACHELOR_DIPLOMA:
    "0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968"
};

let initialConfig: any = {
  APP_PORT: 9000,
  AUTH_EXPIRE_TIME: 60, // minutes
  APP_NAME: "trusted-issuers-registry",
  APP_AUTH_REQUEST_NAME: "ebsi-storage"
};

switch (process.env.NODE_ENV) {
  case "production":
    initialConfig = { ...initialConfig, ...prodConfig };
    break;
  case "development":
    initialConfig = { ...initialConfig, ...devConfig };
    break;
  case "integration":
  default:
    initialConfig = { ...initialConfig, ...intConfig };
    break;
}

// override values from .env or process.env on the current config
const config = { ...initialConfig, ...process.env };

export default config;
