import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "hardhat-abi-exporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import { HardhatUserConfig, task } from "hardhat/config";
import * as fs from "node:fs";

// The solhint plugin overrides the check task, runs solhint
// on the project's sources and prints the report to the console
// when running yarn test

const mnemonicPath = `${__dirname}/.secret.mnemonic`;

let mnemonic = "test test test test test test test test test test test junk";
if (fs.existsSync(mnemonicPath)) {
  console.log(".secret.mnemonic exists and will be used");
  mnemonic = fs.readFileSync(mnemonicPath).toString().trim();
}

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach((account) => console.log(account.address));
});

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      url: "http://localhost:8545",
      accounts: { mnemonic },
    },
    mainnet: {
      url: "https://api-test.ebsi.eu/ledger/v3/blockchains/besu",
      accounts: { mnemonic },
    },
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  abiExporter: {
    path: "./src/abi",
    clear: true,
    flat: true,
    runOnCompile: true,
  },
  solidity: {
    version: "0.8.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
