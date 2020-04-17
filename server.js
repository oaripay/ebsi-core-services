const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const logger = require("./logger");
const errors = require("./errors");
const timestampAPI = require("./api/router");

const app = express();

app.use("*", require("cors")());

app.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use("/timestamp/v1/hashes", timestampAPI);

app.use((req, res, next) => {
  next(new errors.BadRequestError(`Invalid service '${req.url}'`));
});

app.use(errors.handler);

app.listen(config.port, () => {
  logger.info(`Timestampo API started at port ${config.port}`);
});
