const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const cassandraDriver = require("cassandra-driver");

const config = require("./config");
const utils = require("./utils");
const logger = require("./logger");
const auth = require("./auth");
const errors = require("./errors");
const fileStorageAPI = require("./api/file-storage/router");
const keyValueStorageAPI = require("./api/key-value-storage/router");

/*
 * Initializations
 */
const mongoConnection = config.mongo.connectionString;
const mongoOpts = config.mongo.opts;
mongoose.connect(mongoConnection, mongoOpts, (error) => {
  if (error) throw error;
  logger.info("Connected with Mongo");
});

const cassandraConnection = config.cassandra.connection;
const cassandraOpts = config.cassandra.opts;
const cassandra = new cassandraDriver.Client(cassandraConnection);

async function createTablesCassandra() {
  logger.info("Creating tables: file_storage, key_value_storage");
  await cassandra.execute(
    `create table file_storage (id uuid, filename text, hash text, data blob, primary key(id, hash))`
  );
  await cassandra.execute(
    `create table key_value_storage (key text, value text, primary key(key))`
  );
  logger.info("Tables created");
}

async function checkTablesCassandra() {
  try {
    await cassandra.execute(`select * from file_storage`);
    await cassandra.execute(`select * from key_value_storage`);
  } catch (error) {
    createTablesCassandra();
  }
}

(async () => {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < cassandraOpts.reconnectTries; i += 1) {
    try {
      await cassandra.connect();
      logger.info("Connected with Cassandra");
      await checkTablesCassandra();
      return;
    } catch (error) {
      logger.error(error);
    }
    await utils.sleep(cassandraOpts.reconnectInterval);
  }
  /* eslint-enable no-await-in-loop */
  logger.error("Imposible to connect with Cassandra");
})();

if (!fs.existsSync(config.gluster.path)) {
  fs.mkdirSync(config.gluster.path, { recursive: true });
}
logger.info(`==> Gluster files in ${config.gluster.path}`);

/*
 * Router
 */

const app = express();

app.use("*", require("cors")());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.param("store", (req, res, next, store) => {
  if (store !== "distributed") {
    next(new errors.NotFoundError(`Store '${store}' not found`));
    return;
  }
  req.store = store;
  next();
});

app.post("/storage/v1/sessions", auth.callNewSession);

app.use(auth.handleToken);

app.get("/storage/v1/stores", (req, res) => {
  res.send({ items: ["distributed"], total: 1 });
});
app.get("/storage/v1/stores/:store", (req, res) => {
  res.status(204).send();
});

app.use("/storage/v1/stores/:store/files", fileStorageAPI);
app.use("/storage/v1/stores/:store/key-values", keyValueStorageAPI);

app.use((req, res, next) => {
  next(
    new errors.BadRequestError(`Invalid service '${req.method} ${req.url}'`)
  );
});

app.use(errors.handler);

app.listen(config.port, () => {
  logger.info(`Storage API started at port ${config.port}`);
});
