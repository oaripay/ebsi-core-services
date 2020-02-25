const PrivateKeyProvider = require("truffle-hdwallet-provider");
require("dotenv").config();
if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY is not defined");
const privateKey = process.env.PRIVATE_KEY;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    ebsi: {
      provider: () => new PrivateKeyProvider(privateKey, "https://www.ebsi.xyz/jsonrpc"),
      network_id: "*",
      gas:"0x1ffffffffffffe",
      gasPrice: 0
    },
    intebsi: {
      provider: () => new PrivateKeyProvider(privateKey, "https://www.intebsi.xyz/jsonrpc"),
      network_id: "*",
      gas:"0x1ffffffffffffe",
      gasPrice: 0
    },
    functionalTestNet: {
      host: "127.0.0.1",
      port: 18545,     
      network_id: "*",  
    }
  }
};
