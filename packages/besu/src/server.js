const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const logger = require("./logger");
const auth = require("./auth");
const besuAPI = require("./router");
const errors = require("./errors");

class App {
  constructor() {
    this.httpServer = express();

    this.httpServer.use("*", cors());

    this.httpServer.use(
      bodyParser.json({ limit: "10mb", extended: true, type: "*/*" })
    );

    this.httpServer.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });

    this.httpServer.post("/ledger/v1/sessions", auth.callNewSession);

    this.httpServer.use("/ledger/v1/blockchains/besu", besuAPI);

    this.httpServer.use((req, res, next) => {
      next(new errors.BadRequestError(`Invalid service '${req.url}'`));
    });

    this.httpServer.use(errors.handler);
  }

  getServer() {
    return this.httpServer;
  }

  start(port) {
    return this.httpServer.listen(port, () => {
      logger.info(`Hyperledger Besu API started at port ${port}`);
    });
  }
}

module.exports = App;
