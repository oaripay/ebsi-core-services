const cassandraDriver = require("cassandra-driver");
const { v1: uuidv1 } = require("uuid");

const config = require("../../config");
const logger = require("../../logger");
const { BadRequestError, NotFoundError } = require("../../errors");

const TABLE_NOTIFICATION_STORAGE = "notification_storage";
const TABLE_NOTIFICATION_HISTORICAL_STORAGE = "notification_historical_storage";

const cassandraConnection = config.cassandra.connection;
const cassandra = new cassandraDriver.Client(cassandraConnection);

async function getRecord(id) {
  const query = `select * from ${TABLE_NOTIFICATION_STORAGE} where id = ? allow filtering`;
  const result = await cassandra.execute(query, [id]);
  return result.first();
}

async function addNotification(data) {
  const id = uuidv1();
  const { sender, receiver, message } = data;
  const messageString = JSON.stringify(message);
  const query = `insert into ${TABLE_NOTIFICATION_STORAGE} (id, created, sender, receiver, message) values (?, toTimestamp(now()), ?, ?, ?)`;
  const params = [id, sender, receiver, messageString];
  const result = await cassandra.execute(query, params);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra for insert in notifications");
  }
  return { id, sender, receiver, message };
}

async function updateNotification(id, data) {
  const record = await getRecord(id);
  if (!record) throw new NotFoundError("Notification not found");

  const { sender, receiver, message } = data;
  const messageString = JSON.stringify(message);
  const query = `update ${TABLE_NOTIFICATION_STORAGE} set sender = ?, receiver = ?, message = ? where id= ? if exists`;
  const params = [sender, receiver, messageString, id];
  const result = await cassandra.execute(query, params);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra for update in notifications");
  }
  return { id, sender, receiver, message };
}

async function getNotification(id) {
  const record = await getRecord(id);
  if (!record) throw new NotFoundError("Notification not found");
  const { sender, receiver } = record;
  let { message } = record;
  message = JSON.parse(message);
  return { id, sender, receiver, message };
}

async function deleteNotification(id) {
  const r = await getRecord(id);
  if (!r) throw new NotFoundError("Notification not found");

  // save in history
  const queryHistory = `insert into ${TABLE_NOTIFICATION_HISTORICAL_STORAGE} (id, created, deleted, sender, receiver, message) values (?, ?, toTimestamp(now()), ?, ?, ?)`;
  const paramsHistory = [r.id, r.created, r.sender, r.receiver, r.message];

  const resultHistory = await cassandra.execute(queryHistory, paramsHistory);

  if (!resultHistory.info || !resultHistory.info.isSchemaInAgreement) {
    logger.error(resultHistory);
    throw new Error(
      "Bad response from cassandra when saving history of notifications"
    );
  }

  const query = `delete from ${TABLE_NOTIFICATION_STORAGE} where id = ? if exists`;

  const result = await cassandra.execute(query, [id]);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra for delete in notifications");
  }
}

async function getListNotifications(q) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  const { sender, receiver, history } = q;
  if (q && q.page) {
    const { page } = q;
    if (page.size) {
      if (Number(q["page[size]"]) < 0)
        throw new BadRequestError("page[size] must be a positive integer");
      pageSize = page.size;
    }
  }

  let query = `select * from `;
  let params;

  // select table
  if (history === "true") query += TABLE_NOTIFICATION_HISTORICAL_STORAGE;
  else query += TABLE_NOTIFICATION_STORAGE;

  // search for sender / receiver
  if (sender && receiver) {
    query += " where sender = ? and receiver = ?";
    params = [sender, receiver];
  } else if (sender) {
    query += " where sender = ?";
    params = [sender];
  } else if (receiver) {
    query += " where receiver = ?";
    params = [receiver];
  }

  query += " limit ? allow filtering";
  params.push(pageSize);

  const result = await cassandra.execute(query, params, { prepare: true });
  const items = [];

  if (result.rows.length === 0)
    return {
      items,
      total: 0,
    };

  if (history === "true") {
    result.rows.forEach((r) => {
      items.push({
        id: r.id,
        sender: r.sender,
        receiver: r.receiver,
        message: JSON.parse(r.message),
        created: r.created,
        deleted: r.deleted,
      });
    });
  } else {
    result.rows.forEach((r) => {
      items.push({
        id: r.id,
        sender: r.sender,
        receiver: r.receiver,
        message: JSON.parse(r.message),
      });
    });
  }

  return {
    items,
    total: items.length,
  };
}

module.exports = {
  addNotification,
  updateNotification,
  getNotification,
  deleteNotification,
  getListNotifications,
};
