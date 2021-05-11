import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {Tir} from "../src/types";


// follows ETH/BTC's BIP 39 protocol
// https://iancoleman.io/bip39/
// and matches the one hardhat uses when using { accounts: { mnemonic }}
task("insertAdministrator", "insert Administrator to the A Registry", async (taskArgs: {proxy: string, contract: string}, {ethers}) => {
  const [deployer] = await ethers.getSigners();
  const wallet = ethers.Wallet.createRandom().connect(deployer.provider);

  const did = `did:ebsi:${wallet.address.toLowerCase()}`;

  console.log(`
  Wallet: ${did},
  WalletPrivKey: ${wallet.privateKey}
  `);
  const ts = await ethers.getContractAt(taskArgs.contract, taskArgs.proxy, wallet) as Tir;

  const attribute = ethers.utils.toUtf8Bytes(did);
  const response = await (await ts["insertAdministrator(string,bytes)"](did, attribute)).wait(1);
  console.log(response);
  console.log(did);
  const admin = await ts.getAdministrator(did);
  console.log(admin);
})
  .addParam("proxy", "Proxy Address")
  .addParam("contract", "Contract Tag to which admin should be added");
