const express = require("express");
const cassandraDriver = require("cassandra-driver");
const bodyParser = require("body-parser");

const config = require("./config");
const utils = require("./utils");
const logger = require("./logger");
const auth = require("./auth");
const errors = require("./errors");
const fileStorageAPI = require("./api/file-storage/router");
const keyValueStorageAPI = require("./api/key-value-storage/router");
const notificationStorageAPI = require("./api/notification-storage/router");

/*
 * Initializations
 */
const cassandraConnection = config.cassandra.connection;
const cassandraOpts = config.cassandra.opts;
const cassandra = new cassandraDriver.Client(cassandraConnection);

async function checkTableFileStorage() {
  try {
    await cassandra.execute(`select * from file_storage limit 1`);
  } catch (error) {
    logger.info("Creating table 'file_storage'");
    await cassandra.execute(
      `create table file_storage (id uuid, filename text, hash text, data blob, primary key(id, hash))`
    );
  }
}

async function checkTableKeyValueStorage() {
  try {
    await cassandra.execute(`select * from key_value_storage limit 1`);
  } catch (error) {
    logger.info("Creating table 'key_value_storage'");
    await cassandra.execute(
      `create table key_value_storage (key text, value text, primary key(key))`
    );
  }
}

async function checkTableNotificationStorage() {
  try {
    await cassandra.execute(`select * from notification_storage limit 1`);
  } catch (error) {
    logger.info("Creating table 'notification_storage'");
    await cassandra.execute(
      `create table notification_storage (id uuid, created timestamp, sender text, receiver text, message text, primary key(id))`
    );
  }
}

async function checkTableNotificationHistoricalStorage() {
  try {
    await cassandra.execute(
      `select * from notification_historical_storage limit 1`
    );
  } catch (error) {
    logger.info("Creating table 'notification_historical_storage'");
    await cassandra.execute(
      `create table notification_historical_storage (id uuid, created timestamp, deleted timestamp, sender text, receiver text, message text, primary key(id))`
    );
  }
}

async function checkTablesCassandra() {
  const checks = [];
  checks.push(checkTableFileStorage());
  checks.push(checkTableKeyValueStorage());
  checks.push(checkTableNotificationStorage());
  checks.push(checkTableNotificationHistoricalStorage());
  return Promise.all(checks);
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

app.post("/storage/v1/sessions", bodyParser.json(), auth.callNewSession);

app.use(auth.handleToken);

app.get("/storage/v1/stores", (req, res) => {
  res.send({ items: ["distributed"], total: 1 });
});
app.get("/storage/v1/stores/:store", (req, res) => {
  res.status(204).send();
});

app.use("/storage/v1/stores/:store/files", fileStorageAPI);
app.use("/storage/v1/stores/:store/key-values", keyValueStorageAPI);
app.use("/storage/v1/stores/:store/notifications", notificationStorageAPI);

app.use((req, res, next) => {
  next(
    new errors.BadRequestError(`Invalid service '${req.method} ${req.url}'`)
  );
});

app.use(errors.handler);

app.listen(config.port, () => {
  logger.info(`Storage API started at port ${config.port}`);
});
