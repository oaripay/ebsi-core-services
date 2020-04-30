const express = require("express");
const bodyParser = require("body-parser");

const config = require("./config");
const logger = require("./logger");
const auth = require("./auth");
const besuAPI = require("./router");
const errors = require("./errors");

const app = express();

app.use("*", require("cors")());

app.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.post("/ledger/v1/sessions", auth.callNewSession);
app.use("/ledger/v1/blockchains/besu", besuAPI);

app.use((req, res, next) => {
  next(new errors.BadRequestError(`Invalid service '${req.url}'`));
});

app.use(errors.handler);

const server = app.listen(config.port, () => {
  logger.info(`Hyperledger Besu API started at port ${config.port}`);
  if (config.testMode) logger.info("EBSI TEST MODE enabled");
});

module.exports = server;
