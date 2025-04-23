import { NetworksUserConfig } from "hardhat/types/index.js";

export const networks: NetworksUserConfig = {
  // Needed for `solidity-coverage`
  coverage: {
    url: "http://localhost:8555",
  },

  // goerli
  goerli: {
    accounts: {
      count: 10,
      initialIndex: 0,
      mnemonic: "oh my dear",
      path: "m/44'/60'/0'/0",
    },
    chainId: 5,
    gas: "auto",
    gasMultiplier: 1.5,
    gasPrice: 1_000_000_000, // 1 gwei
    url: "https://goerli.infura.io/v3/YOUR-INFURA-KEY",
  },

  // Mainnet
  mainnet: {
    accounts: ["0xaaaa"],
    chainId: 1,
    gas: "auto",
    gasMultiplier: 1.5,
    gasPrice: 50_000_000_000,
    url: "https://mainnet.infura.io/v3/YOUR-INFURA-KEY",
  },
};

export default networks;
