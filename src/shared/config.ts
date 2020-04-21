import * as dotenv from 'dotenv';

dotenv.config();

let config: any = {
  APP_PORT: 9000,
  WALLET_PRIV_KEY: 'this comes from env secret',
  AUTH_EXPIRE_TIME: 60, // minutes
};

const devConfig = {
  WEB3_PROVIDER: 'https://www.ebsi.xyz/jsonrpc',
  CONTRACT_ADDR: '0x4723D3AdC915D1bf65c0834Ce4CC21d2630cfd51',
};

const prodConfig = {
  WEB3_PROVIDER: 'https://www.ebsi.xyz/jsonrpc',
  CONTRACT_ADDR: '0x4723D3AdC915D1bf65c0834Ce4CC21d2630cfd51',
};

const intConfig = {
  WEB3_PROVIDER: 'https://www.intebsi.xyz/jsonrpc',
  CONTRACT_ADDR: '0xd6A7c915066E17ba18024c799258C8A286fFBc00',
};

const localConfig = {
  WEB3_PROVIDER: 'http://localhost:8545',
  CONTRACT_ADDR: '0xBCb85Ca4Cfb22dB204707778Ef513C8cEf9Dc894',
};

switch (process.env.NODE_ENV) {
  case 'production':
    config = {...config, ...prodConfig, ...process.env};
    break;
  case 'development':
    config = {...config, ...devConfig, ...process.env};
    break;
  case 'integration':
    // same as default
  default:
    config = {...config, ...localConfig, ...process.env};
    break;
}

export default config;
