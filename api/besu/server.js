const express = require("express");

const config = require("./config");
const logger = require("./logger");
const auth = require("./auth");
const besuAPI = require("./router");
const errors = require("./errors");

const app = express();

app.use("*", require("cors")());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.post("/ledger/v1/sessions", auth.callNewSession);
app.use("/ledger/v1/blockchains/besu", besuAPI);

app.use("/*", (req, res, next) => {
  next(new errors.BadRequestError(`Invalid service '${req.url}'`));
});

app.use(errors.handler);

app.listen(config.port, () => {
  logger.info(`EBSI Server started at port ${config.port}`);
});
