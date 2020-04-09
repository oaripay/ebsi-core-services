var express = require("express");
var mongoose = require("mongoose");
var fs = require("fs");
var app = express();
var cassandraDriver = require("cassandra-driver");
const debug = require("debug")("http-headers");

require("dotenv").config();

var config = require("./config");
var utils = require("./utils");

app.get("/", (req, res) => {
  res.status(200).send("EBSI API REST");
});

function startServer() {
  var opts = {
    appname: "EBSI",
    poolSize: 10,
    autoIndex: false,
    bufferMaxEntries: 0,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500,
    autoReconnect: true,
    loggerLevel: "error", //error / warn / info / debug
    keepAlive: 120,
    validateOptions: true,
    useNewUrlParser: true
  };

  let connectString = config.mongodb.connectionString;
  mongoose.connect(connectString, opts, function(err) {
    if (err) throw err;
    console.log("==> Connected with MongoDB");
  });

  const cassandra = new cassandraDriver.Client(config.cassandra);
  (async () => {
    var ATTEMPTS = 50000;
    for (var i = 0; i < ATTEMPTS; i++) {
      try {
        if (i > 0) console.log(`Connecting with cassandra. Retry ${i}`);
        await cassandra.connect();
        console.log("==> Connected with Cassandra");
        return;
      } catch (error) {
        console.log("==> Error connecting with cassandra");
        console.log(error);
      }
      await utils.sleep(5000);
    }
    console.log("Imposible to connect with cassandra");
  })();

  if (!fs.existsSync(config.glusterfs.path)) {
    fs.mkdirSync(config.glusterfs.path);
  }
  console.log("==> Connected with GlusterFS");

  app.use("*", require("cors")());
  app.use("/public", express.static(__dirname + "/public"));

  app.use((req, res, next) => {
    var log = msg => {
      var now = new Date().toISOString().slice(0, -5);
      console.log(`${now}: ${msg}`);
    };
    log(req.url);
    debug(req.headers);
    req.cassandra = cassandra;
    next();
  });

  if (config.apis.besu) app.use("/blockchain/besu", require("./apis/besu"));
  if (config.apis.notary) app.use("/notary", require("./apis/notary"));
  if (config.apis.fileStorage)
    app.use("/file-storage", require("./apis/file-storage"));
  if (config.apis.walletRequestStorage)
    app.use(
      "/wallet-request-storage",
      require("./apis/wallet-request-storage")
    );
  if (config.apis.walletHistoricalStorage)
    app.use(
      "/wallet-historical-storage",
      require("./apis/wallet-historical-storage")
    );
  if (config.apis.keyValueStorage) {
    app.use("/key-value-storage", require("./apis/key-value-storage"));
  }

  app.get("/*", function(req, res) {
    res.status(400).send({ message: "Invalid service" });
  });

  app.listen(config.port, () => {
    console.log(`EBSI Server started at port ${config.port}`);
  });
}

if (require.main === module) {
  startServer();
} else {
  module.exports = startServer;
}
