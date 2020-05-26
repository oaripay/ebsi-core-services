const cassandraDriver = require("cassandra-driver");
const querystring = require("querystring");
const jsonpatch = require("fast-json-patch");

const config = require("../../../../config");
const logger = require("../../../../logger");
const {
  BadRequestError,
  NotFoundError,
  KeyTooLargeError,
  ValueTooLargeError,
} = require("../../../../errors");

const TABLE_KEY_VALUE_STORAGE = "key_value_storage";
const MAX_SIZE_KEY = 256; // 256 bytes
const MAX_SIZE_VALUE = 1024 * 1024; // 1 MB

const cassandraConnection = config.cassandra.connection;
const cassandra = new cassandraDriver.Client(cassandraConnection);

function buildLink(store, before, after, pageSize) {
  const query = {};
  /* if (before) query["page[before]"] = before;

  if (after) query["page[after]"] = after; */

  if (pageSize && pageSize !== config.DEFAULT_PAGE_SIZE)
    query["page[size]"] = pageSize;

  return `/storage/v1/stores/${store}/files?${querystring.stringify(query)}`;
}

async function getRecord(key) {
  const query = `select value from ${TABLE_KEY_VALUE_STORAGE} where key = ? allow filtering`;
  const result = await cassandra.execute(query, [key]);
  return result.first();
}

async function setKey(key, value, skipReadThenUpdate = false) {
  let type;
  let query;
  let params;
  let stringValue = value;
  if (typeof value === "object") stringValue = JSON.stringify(value);

  if (key.length > MAX_SIZE_KEY)
    throw new KeyTooLargeError(
      `Max size for 'key' is ${MAX_SIZE_KEY} bytes. Received ${key.length}`
    );

  if (stringValue.length > MAX_SIZE_VALUE)
    throw new ValueTooLargeError(
      `Max size for 'value' is ${MAX_SIZE_VALUE} bytes. Received ${stringValue.length}`
    );

  // check if the key exists
  let exist = false;
  if (!skipReadThenUpdate) exist = !!(await getRecord(key));

  if (exist || skipReadThenUpdate) {
    // update key
    type = "update";
    query = `update ${TABLE_KEY_VALUE_STORAGE} set value = ? where key = ? if exists`;
    params = [stringValue, key];
  } else {
    // insert key
    type = "insert";
    query = `insert into ${TABLE_KEY_VALUE_STORAGE} (key, value) values (?, ?)`;
    params = [key, stringValue];
  }

  const result = await cassandra.execute(query, params);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error(
      `Bad response from cassandra for '${type}' in key value storage`
    );
  }
  const response = {};
  response[key] = value;
  return { type, result: response };
}

async function getKey(key) {
  const record = await getRecord(key);
  if (!record) throw new NotFoundError("key not found");
  const stringValue = record.value;

  // convert to JSON if it is the case
  let value;
  try {
    value = JSON.parse(stringValue);
  } catch (error) {
    value = stringValue;
  }
  return value;
}

async function deleteKey(key) {
  const record = await getRecord(key);
  if (!record) throw new NotFoundError("key not found");
  const query = `delete from ${TABLE_KEY_VALUE_STORAGE} where key = ? if exists`;

  const result = await cassandra.execute(query, [key]);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error(`Bad response from cassandra when deleting a key`);
  }
}

async function patchKey(key, patch) {
  const value = await getKey(key);
  if (typeof value !== "object")
    throw new BadRequestError(
      `The key to be patched is not a JSON but a ${typeof value}`
    );

  let newValue;
  try {
    newValue = jsonpatch.applyPatch(value, patch).newDocument;
  } catch (error) {
    throw new BadRequestError(`Impossible to apply patch: ${error.message}`);
  }

  const { result } = await setKey(key, newValue, true);
  return result[key];
}

async function getListKeys(q, store) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  if (q && q.page) {
    const { page } = q;
    if (page.size) {
      if (Number(page.size) < 0)
        throw new BadRequestError("page[size] must be a positive integer");
      pageSize = parseInt(Number(page.size), 10);
    }
  }

  const query = `select key from ${TABLE_KEY_VALUE_STORAGE} limit ?`;
  const params = [pageSize];

  const result = await cassandra.execute(query, params, { prepare: true });

  const items = [];
  result.rows.forEach((r) => {
    items.push(r.key);
  });

  const links = {
    first: buildLink(store, null, null, pageSize),
    prev: buildLink(store, null, null, pageSize),
    next: buildLink(store, null, null, pageSize),
    last: buildLink(store, null, null, pageSize),
  };

  return {
    items,
    total: items.length,
    pageSize,
    links,
  };
}

module.exports = {
  setKey,
  getKey,
  deleteKey,
  patchKey,
  getListKeys,
};
