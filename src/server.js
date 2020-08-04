const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const logger = require("./logger");
const { BadRequestError, handler: errorHandler } = require("./errors");
const timestampAPI = require("./api/router");

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

    this.httpServer.use("/timestamp/v1/hashes", timestampAPI);

    this.httpServer.use((req, res, next) => {
      next(
        new BadRequestError(BadRequestError.defaulTitle, {
          detail: `Invalid service '${req.url}'`,
        })
      );
    });

    this.httpServer.use(errorHandler);
  }

  getServer() {
    return this.httpServer;
  }

  start(port) {
    return this.httpServer.listen(port, () => {
      logger.info(`Timestamp API started at port ${port}`);
    });
  }
}

module.exports = App;
