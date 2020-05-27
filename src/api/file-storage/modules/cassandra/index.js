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
  if (pageSize && pageSize !== config.DEFAULT_PAGE_SIZE)
    query["page[size]"] = pageSize;

  return `/storage/v1/stores/${store}/files?${querystring.stringify(query)}`;
}

async function getRecord(hash) {
  const query = `select * from ${TABLE_FILE_STORAGE} where hash = ? allow filtering`;
  const result = await cassandra.execute(query, [hash]);
  return result.first();
}

async function storeFile(filename, file) {
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
  if (q && q.page) {
    const { page } = q;
    if (page.size) {
      if (Number(page.size) < 0)
        throw new BadRequestError("page[size] must be a positive integer");
      pageSize = parseInt(Number(page.size), 10);
    }
  }

  const query = `select id, hash from ${TABLE_FILE_STORAGE} limit ?`;
  const params = [pageSize];

  const result = await cassandra.execute(query, params, { prepare: true });

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when querying");
  }

  const items = [];
  result.rows.forEach((r) => {
    items.push(r.hash);
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
  storeFile,
  readFile,
  deleteFile,
  getListFiles,
};
