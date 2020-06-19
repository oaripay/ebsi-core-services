const EthereumTx = require("ethereumjs-tx").Transaction;

function deserialize(sertx) {
  const tx = new EthereumTx(sertx);
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
}

function isDeployingSmartContract(query) {
  if (query.method !== "eth_sendRawTransaction") return false;
  const tx = deserialize(query.params[0]);
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
