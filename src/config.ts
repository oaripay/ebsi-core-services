import * as dotenv from 'dotenv';

dotenv.config();

const prodConfig = {
  PROVIDER: 'https://www.intebsi.xyz/jsonrpc',
  // WALLET_PRIV_KEY: '...',
  UNIV_CONTRACT_ADDR: '0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1',
  GOV_CONTRACT_ADDR: '0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78',
};

const devConfig = {
  PROVIDER: 'https://www.intebsi.xyz/jsonrpc',
  // WALLET_PRIV_KEY: '...',
  UNIV_CONTRACT_ADDR: '0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1',
  GOV_CONTRACT_ADDR: '0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78',
  APP_PORT: 9000,
};

const intConfig = {
  PROVIDER: 'https://www.intebsi.xyz/jsonrpc',
  // WALLET_PRIV_KEY: '...',
  UNIV_CONTRACT_ADDR: '0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517',
  GOV_CONTRACT_ADDR: '0x2E1f232a9439C3D459FcEca0BeEf13acc8259Dd8',
};

let config: any = {
  APP_PORT: 9000,
  AUTH_EXPIRE_TIME: 60, // minutes
};

switch (process.env.NODE_ENV) {
  case 'production':
    config = {...config, ...prodConfig};
    break;
  case 'development':
    config = {...config, ...devConfig};
    break;
  case 'integration':
  default:
    config = {...config, ...intConfig};
    break;
}

// override values from .env or process.env on the current config
config = {...config, ...process.env};

export default config;
