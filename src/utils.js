const EthereumJsTx = require("ethereumjs-tx").Transaction;
const Common = require("ethereumjs-common").default;
const axios = require("axios");
const { besuRPCNode } = require("./config");

let chainId;

async function getChainId() {
  if (chainId) return chainId;

  try {
    const response = await axios.post(besuRPCNode, {
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
      id: 1,
    });
    chainId = response.data.result;
  } catch (error) {
    throw new Error(`Error getting ebsi chainId: ${error.message}`);
  }

  return chainId;
}

async function deserialize(sertx) {
  const optsChain = {
    common: Common.forCustomChain(
      "mainnet",
      {
        name: "ebsi-network",
        networkId: await getChainId(),
        chainId: await getChainId(),
      },
      "petersburg"
    ),
  };

  try {
    const tx = new EthereumJsTx(sertx, optsChain);
    const array = tx.toJSON();
    return {
      nonce: array[0],
      gasPrice: array[1],
      gasLimit: array[2],
      to: array[3],
      value: array[4],
      data: array[5],
      /* v: array[6],
      r: array[7] */
    };
  } catch (error) {
    const err = error;
    if (err.message.includes(`chain id ${chainId}`))
      err.message = `Invalid chain id. Please set chain id to ${chainId}`;
    throw err;
  }
}

async function isDeployingSmartContract(query) {
  if (query.method !== "eth_sendRawTransaction") return false;
  const tx = await deserialize(query.params[0]);
  if ((parseInt(tx.to, 16) === 0 || tx.to === "0x") && tx.data !== "0x") {
    /* deploy when "to" is 0 and there is "data" */
    return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  isDeployingSmartContract,
  sleep,
};
