import { NetworksUserConfig } from "hardhat/types";

export const networks: NetworksUserConfig = {
  // Needed for `solidity-coverage`
  coverage: {
    url: "http://localhost:8555",
  },

  // goerli
  goerli: {
    url: "https://goerli.infura.io/v3/YOUR-INFURA-KEY",
    chainId: 5,
    accounts: {
      mnemonic: "oh my dear",
      path: "m/44'/60'/0'/0",
      initialIndex: 0,
      count: 10,
    },
    gas: "auto",
    gasPrice: 1000000000, // 1 gwei
    gasMultiplier: 1.5,
  },

  // Mainnet
  mainnet: {
    url: "https://mainnet.infura.io/v3/YOUR-INFURA-KEY",
    chainId: 1,
    accounts: ["0xaaaa"],
    gas: "auto",
    gasPrice: 50000000000,
    gasMultiplier: 1.5,
  },
};

export default networks;
