const jose = require("jose");
const ethers = require("ethers");

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getJWKfromHex,
  sleep,
};
