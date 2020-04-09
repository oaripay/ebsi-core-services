var jose = require("jose");
var ethers = require("ethers");
var EthereumTx = require("ethereumjs-tx").Transaction;
var debug = require("debug");

function hex2base64url(dataHex) {
  var buffer = Buffer.from(dataHex, "hex");
  var base64 = buffer.toString("base64");
  var base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64url;
}

function getJWKfromHex(privKey) {
  if (!privKey.startsWith("0x")) privKey = "0x" + privKey;

  var s = new ethers.utils.SigningKey(privKey);
  var pubKey = s.publicKey;

  // remove 0x and 0x04 to be used in jose library
  privKey = privKey.replace("0x", "");
  pubKey = pubKey.replace("0x04", "");

  return jose.JWK.asKey({
    crv: "secp256k1",
    kty: "EC",
    d: hex2base64url(privKey),
    x: hex2base64url(pubKey.substr(0, 64)),
    y: hex2base64url(pubKey.substr(64, 64))
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isDeployingSmartContract(query) {
  if (query.method !== "eth_sendRawTransaction") return false;
  var tx = deserialize(query.params[0]);
  debug("eth_sendRawTransaction")(tx);
  if ((parseInt(tx.to) === 0 || tx.to === "0x") && tx.data !== "0x") {
    /* deploy when "to" is 0 and there is "data" */
    debug("eth_sendRawTransaction")("Action to deploy of a new contract");
    return true;
  }
  return false;
}

function deserialize(sertx) {
  var tx = new EthereumTx(sertx);
  var array = tx.toJSON();
  return {
    nonce: array[0],
    gasPrice: array[1],
    gasLimit: array[2],
    to: array[3],
    value: array[4],
    data: array[5]
    /*v: array[6],
    r: array[7] */
  };
}

module.exports = {
  hex2base64url,
  getJWKfromHex,
  sleep,
  isDeployingSmartContract
};
