const express = require("express");

const config = require("./config");
const logger = require("./logger");
const auth = require("./auth");
const errors = require("./errors");
const fileStorageAPI = require("./api/file-storage/router");
const keyValueStorageAPI = require("./api/key-value-storage/router");

const app = express();

app.use("*", require("cors")());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.param("store", (req, res, next, store) => {
  if(store !== "distributed") {
    next(new errors.NotFoundError(`Store '${store}' not found`));
    return;
  }
  req.store = store;
  next();
});

app.post("/storage/v1/sessions", auth.callNewSession);

app.get("/storage/v1/stores", (req, res) => {
  res.send({ items: ["distributed"], total: 1});
});
app.get("/storage/v1/stores/:store", (req, res) => {
  res.status(204).send();
});

app.use("/storage/v1/stores/:store/files", fileStorageAPI);
app.use("/storage/v1/stores/:store/key-values", keyValueStorageAPI);

app.use((req, res, next) => {
  next(new errors.BadRequestError(`Invalid service '${req.method} ${req.url}'`));
});

app.use(errors.handler);

app.listen(config.port, () => {
  logger.info(`Storage API started at port ${config.port}`);
});
