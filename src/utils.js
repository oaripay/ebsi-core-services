const jose = require("jose");
const ethers = require("ethers");
const EthereumTx = require("ethereumjs-tx").Transaction;
const debug = require("debug");

function hex2base64url(dataHex) {
  const buffer = Buffer.from(dataHex, "hex");
  const base64 = buffer.toString("base64");
  const base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64url;
}

function getJWKfromHex(_privKey) {
  let privKey = _privKey;
  if (!privKey.startsWith("0x")) privKey = `0x${privKey}`;

  const s = new ethers.utils.SigningKey(privKey);
  let pubKey = s.publicKey;

  // remove 0x and 0x04 to be used in jose library
  privKey = privKey.replace("0x", "");
  pubKey = pubKey.replace("0x04", "");

  return jose.JWK.asKey({
    crv: "secp256k1",
    kty: "EC",
    d: hex2base64url(privKey),
    x: hex2base64url(pubKey.substr(0, 64)),
    y: hex2base64url(pubKey.substr(64, 64)),
  });
}

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
  debug("eth_sendRawTransaction")(tx);
  if ((parseInt(tx.to, 16) === 0 || tx.to === "0x") && tx.data !== "0x") {
    /* deploy when "to" is 0 and there is "data" */
    debug("eth_sendRawTransaction")("Action to deploy of a new contract");
    return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getJWKfromHex,
  isDeployingSmartContract,
  sleep,
};
