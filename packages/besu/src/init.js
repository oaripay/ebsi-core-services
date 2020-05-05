const ethers = require("ethers");
const { getJWKfromHex } = require("./utils");

const wallet = ethers.Wallet.createRandom();
const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
const key = getJWKfromHex(wallet.privateKey);

const privKeyHex = Buffer.from(key.d, "base64").toString("hex");
const pubKeyHex =
  Buffer.from(key.x, "base64").toString("hex") +
  Buffer.from(key.y, "base64").toString("hex");
const pubKeyHexWithPrefix = signingKey.publicKey;
const privKeyPEM = key.toPEM(true);
const pubKeyPEM = key.toPEM(false);
const privKeyBase64 = Buffer.from(privKeyPEM, "utf8").toString("base64");
const pubKeyBase64 = Buffer.from(pubKeyPEM, "utf8").toString("base64");

/* eslint-disable no-console */
console.log(`

================================
===== Random Key Generator =====
================================


===== HEX representation =====
private key:
${privKeyHex}

public key:
    ${pubKeyHex}

public key with prefix:
${pubKeyHexWithPrefix}

address:
${wallet.address}

===== PEM representation =====

${privKeyPEM}

${pubKeyPEM}

===== PEM converted into Base64 =====
private key:
${privKeyBase64}

public key:
${pubKeyBase64}
`);
