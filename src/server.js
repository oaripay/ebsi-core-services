const express = require("express");
const cassandraDriver = require("cassandra-driver");
const bodyParser = require("body-parser");
const cors = require("cors");

const config = require("./config");
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
      logger.error(`Connection with cassandra: ${error.message}`);
    }
    await new Promise((resolve) =>
      setTimeout(resolve, cassandraOpts.reconnectInterval)
    );
  }
  /* eslint-enable no-await-in-loop */
  logger.error("Imposible to connect with Cassandra");
})();

class App {
  constructor() {
    this.httpServer = express();

    this.httpServer.use("*", cors());

    this.httpServer.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`);
      next();
    });

    this.httpServer.param("store", (req, res, next, store) => {
      if (store !== "distributed") {
        next(new errors.NotFoundError(`Store '${store}' not found`));
        return;
      }
      req.store = store;
      next();
    });

    this.httpServer.post(
      "/storage/v1/sessions",
      bodyParser.json(),
      auth.callNewSession
    );

    this.httpServer.use(auth.handleToken);

    this.httpServer.get("/storage/v1/stores", (req, res) => {
      res.send({ items: ["distributed"], total: 1 });
    });
    this.httpServer.get("/storage/v1/stores/:store", (req, res) => {
      res.status(204).send();
    });

    this.httpServer.use("/storage/v1/stores/:store/files", fileStorageAPI);
    this.httpServer.use(
      "/storage/v1/stores/:store/key-values",
      keyValueStorageAPI
    );
    this.httpServer.use(
      "/storage/v1/stores/:store/notifications",
      notificationStorageAPI
    );

    this.httpServer.use((req, res, next) => {
      next(
        new errors.BadRequestError(`Invalid service '${req.method} ${req.url}'`)
      );
    });

    this.httpServer.use(errors.handler);
  }

  start(port) {
    return this.httpServer.listen(port, () => {
      logger.info(`Storage API started at port ${port}`);
    });
  }
}

module.exports = App;
