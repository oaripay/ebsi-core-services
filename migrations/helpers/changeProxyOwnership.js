/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
const HDWalletProvider = require("@truffle/hdwallet-provider");

const fs = require("fs");

const {exit} = require("process");

const mnemonic = fs.readFileSync(".secret").toString().trim();
const contractAddress = process.argv.slice(2)[0];
const newProxyAdmin = process.argv.slice(2)[1];
const nodeURL = `http://localhost:8545`;
console.log("-----------NodeRL:", nodeURL);
const prov = new HDWalletProvider(mnemonic, nodeURL);

const Web3 = require("web3");

const web3 = new Web3(prov);

const getBalances = async (address) => {
  return web3.eth.getBalance(address);
};
const Contract = require("web3-eth-contract");
const jsonInterface = require("../../build/contracts/OwnedUpgradeabilityProxy.json");
// set provider for all later instances to use
Contract.setProvider(prov);

/**
 * CONSTANT
 *
 *  */

const gasPrice = web3.utils.toWei("200", "gwei");
const proxyAdmin = prov.addresses[0];

const getAdmin = (adminAddress) => {
  const contract = new Contract(jsonInterface.abi, contractAddress);
  return contract.methods.admin().call({from: adminAddress});
};
const getImplementation = (adminAddress) => {
  const contract = new Contract(jsonInterface.abi, contractAddress);
  return contract.methods.implementation().call({from: adminAddress});
};

const transferOwnership = (newAdmin, curAdmin) => {
  const contract = new Contract(jsonInterface.abi, contractAddress);
  return contract.methods.changeAdmin(newAdmin).send({
    from: curAdmin,
    gasPrice,
  });
};
console.log(
  `
  prov.addresses : ${JSON.stringify(prov.addresses)}
  `
);
getBalances(proxyAdmin).then(async (balance) => {
  if (balance < 200000000000000000) {
    console.error(
      `Balance of ${proxyAdmin} : ${balance}/${web3.utils.fromWei(
        balance,
        "ether"
      )} ETH is insufficent you need at least 0.2 ether to deploy. Send ether to that address and start again.`
    );

    exit(-1);
  } else {
    console.log(
      `-----------Admin Proxy address: ${proxyAdmin} balance: ${web3.utils.fromWei(
        balance,
        "ether"
      )} ETH`
    );

    console.log(
      `
      `
    );
    const currentAdmin = await getAdmin(proxyAdmin);
    console.log(
      `
      current Admin: ${JSON.stringify(currentAdmin)}
      `
    );
    const currentImplementation = await getImplementation(proxyAdmin);
    console.log(
      `
      current Implementation : ${JSON.stringify(currentImplementation)}
      `
    );

    console.log(
      `--Transfer Ownership from ${proxyAdmin} to ${newProxyAdmin}  `
    );
    const receipt = await transferOwnership(newProxyAdmin, proxyAdmin);
    console.log(
      `
      receipt : ${JSON.stringify(receipt)}
      `
    );
    exit(0);
  }
});
