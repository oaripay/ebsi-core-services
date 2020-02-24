const PrivateKeyProvider = require("truffle-hdwallet-provider");
const privateKey = "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63";
const privateKeyProvider = new PrivateKeyProvider(privateKey, "http://ebsi.xyz/jsonrpc");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    ebsi: {
      provider: () => new PrivateKeyProvider(privateKey, "https://ebsi.xyz/jsonrpc"),
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
