const ganache = require("ganache-core");
const Web3 = require("web3");
const {networks} = require("../../truffle-config.js");

function initWeb3(network) {
  let web3;
  if (network === "development") {
    web3 = new Web3(ganache.provider());
  } else {
    const {provider} = networks[network] || {};
    if (!provider) {
      throw new Error(`Unable to find provider for network: ${network}`);
    }
    web3 = new Web3(provider);
  }
  return web3;
}
module.exports = initWeb3;
