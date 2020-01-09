require("dotenv").config();
var _ = require("lodash");

// todo keys from doc hashed mongo...
const config = {
  api: "https://api.ebsi.xyz/",
  private_key:
    "0x81e4b01ba124f35f521fc83ff6c11bdbf8d31b21a1765f165af09dd965fc832f",

  credential: {
    username: "notary",
    password: "notary"
  },

  title: "Notary DApp"
};

let serviceUrl;
let casUrl;

const PUBLIC_URL = process.env.PUBLIC_URL || "";
if (PUBLIC_URL) {
  serviceUrl = `${PUBLIC_URL}/user`;
} else {
  const host = process.env.HOST || "localhost";
  const port = process.env.PORT || "3000";

  if (process.env.HTTPS && process.env.HTTPS.toUpperCase() === "ON") {
    serviceUrl = `https://${host}:${port}/user`;
  } else {
    serviceUrl = `http://${host}:${port}/user`;
  }
}

if (
  process.env.NODE_ENV &&
  process.env.NODE_ENV.toLowerCase() === "production"
) {
  casUrl = "https://ecas.ec.europa.eu/cas";
} else {
  casUrl = "https://ecas.acceptance.ec.europa.eu/cas";
}

_.assign(config, { serviceUrl: serviceUrl, casUrl: casUrl });

console.log("conf ************************************ title: ", config.title);
console.log(
  "conf ************************************ https: ",
  process.env.HTTPS
);
console.log(
  "conf ************************************ NODE_ENV: ",
  process.env.NODE_ENV
);
// console.log('conf ************************************ config: ', config);

module.exports = config;
