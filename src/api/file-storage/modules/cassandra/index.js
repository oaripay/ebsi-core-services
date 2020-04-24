const fs = require("fs");
const ethers = require("ethers");
const querystring = require("querystring");
const cassandraDriver = require("cassandra-driver");

const config = require("../../../../config");
const logger = require("../../../../logger");
const { BadRequestError, NotFoundError } = require("../../../../errors");

const TABLE_FILE_STORAGE = "file_storage";

const cassandraConnection = config.cassandra.connection;
const cassandra = new cassandraDriver.Client(cassandraConnection);

function buildLink(store, before, after, pageSize) {
  const query = {};
  if (before) query["page[before]"] = before;

  if (after) query["page[after]"] = after;

  if (pageSize && pageSize !== config.DEFAULT_PAGE_SIZE)
    query["page[size]"] = pageSize;

  return `/storage/v1/stores/${store}/files?${querystring.stringify(query)}`;
}

function toBuffer(uuid) {
  const hexStr = uuid.replace(/-/g, "");
  return Buffer.from(hexStr, "hex");
}

async function getRecord(hash) {
  const query = `select * from ${TABLE_FILE_STORAGE} where hash = ? allow filtering`;
  const result = await cassandra.execute(query, [hash]);
  return result.first();
}

async function storeFile(filename, file) {
  if (!filename || !file) throw new Error("No filename or file defined");

  const data = fs.readFileSync(file);
  const hash = ethers.utils.keccak256(data);
  const record = await getRecord(hash);
  if (record)
    throw new BadRequestError(
      `This file is already stored with name '${record.filename}'`
    );

  const query = `insert into ${TABLE_FILE_STORAGE} (id, filename, hash, data) VALUES (now(), ?, ?, ?)`;
  const params = [filename, hash, data];

  const result = await cassandra.execute(query, params);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when storing the file");
  }
  return { hash, function: "keccak256" };
}

async function readFile(hash) {
  const record = await getRecord(hash);
  if (!record) throw new NotFoundError("File not found");

  return record;
}

async function deleteFile(hash) {
  const record = await getRecord(hash);
  if (!record) throw new NotFoundError("File not found");

  const query = `delete from ${TABLE_FILE_STORAGE} where id = ? and hash = ? if exists`;
  const result = await cassandra.execute(query, [record.id, hash]);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when deleting the file");
  }
}

async function getListFiles(q, store) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  let pageAfter = null;
  let pageBefore = null;
  if (q && q.page) {
    const { page } = q;
    if (page.size) {
      if (Number(q["page[size]"]) < 0)
        throw new BadRequestError("page[size] must be a positive integer");
      pageSize = page.size;
    }

    if (page.after) pageAfter = toBuffer(page.after);
    if (page.before) pageBefore = toBuffer(page.before);
  }

  let query = `select id, hash from ${TABLE_FILE_STORAGE}`;
  let params;
  if (pageAfter) {
    query += ` where id > maxTimeuuid(unixTimestampOf(?)) limit ? allow filtering`;
    params = [pageAfter, pageSize];
  } else if (pageBefore) {
    query += ` where id < minTimeuuid(unixTimestampOf(?)) order by id desc limit ? allow filtering`;
    params = [pageBefore, pageSize];
  } else {
    query += ` limit ?`;
    params = [pageSize];
  }

  let result;
  try {
    result = await cassandra.execute(query, params, { prepare: true });
  } catch (error) {
    if (
      error.message.includes("Invalid string representation of Uuid") ||
      error.message.includes("UUID should be 16 or 0 bytes")
    )
      throw new BadRequestError(`Invalid parameter: ${error.message}`);
    throw error;
  }

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when querying");
  }

  const items = [];
  result.rows.forEach((r) => {
    items.push(r.hash);
  });

  if (result.rows.length === 0)
    return {
      items,
      total: 0,
    };

  const lastID = result.rows[result.rows.length - 1].id.toString();

  const links = {
    first: buildLink(store, null, null, pageSize),
    prev: buildLink(store, lastID, null, pageSize),
    next: buildLink(store, null, lastID, pageSize),
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
  storeFile,
  readFile,
  deleteFile,
  getListFiles,
};
