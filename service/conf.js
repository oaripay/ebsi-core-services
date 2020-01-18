require("dotenv").config();
const _ = require("lodash");

// todo keys from doc hashed mongo...
const config = {
  api: 'https://api.ebsi.xyz/',
  private_key: "-----BEGIN PRIVATE KEY-----\nMIGEAgEAMBAGByqGSM49AgEGBSuBBAAKBG0wawIBAQQgs6s3dObknLuMwW8uf3OD\nP7iSostg/+Gu1sOHmQO9rtqhRANCAASzeFJSgwEVgUInB9jIEi9ppB4qPXJYe5YT\n2aR6rwK4mZ/5scpJeS/m+HeV108pd6M1BlzgehCvQPTwUMkFA+hw\n-----END PRIVATE KEY-----",

  credential: {
    username: 'notary',
    password: 'notary'
  },

  title: 'Notary DApp',
  titleEuFunding: 'EU Funding',
  mongoConf: 'mongodb://mongodb:27017/notarydapp'

};

var host = process.env.HOST || 'localhost';
var port = process.env.PORT || '3000';

let serviceUrl;
let casUrl;
let mongoConf;

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

if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'dev') {
  config.mongoConf = 'mongodb://localhost:27017/notarydapp';
  console.log('browse: ', serviceUrl);
}

if (
  process.env.NODE_ENV &&
  process.env.NODE_ENV.toLowerCase() === "production"
) {
  casUrl = "https://ecas.ec.europa.eu/cas";
} else {
  casUrl = "https://ecas.acceptance.ec.europa.eu/cas";
}

_.assign(config, { serviceUrl, casUrl });

console.log("conf ************************************ title: ", config.title);
console.log("conf ************************************ https: ", process.env.HTTPS);
console.log("conf ************************************ NODE_ENV: ", process.env.NODE_ENV);
// console.log('conf ************************************ config: ', config);

module.exports = config;
