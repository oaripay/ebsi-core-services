const fs = require("fs");
const ethers = require("ethers");
const cassandraDriver = require("cassandra-driver");

const config = require("../../../../config");
const logger = require("../../../../logger");
const { BadRequestError, NotFoundError } = require("../../../../errors");

const TABLE_FILE_STORAGE = "files";

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

async function getRecord(hash) {
  const query = `select * from ${TABLE_FILE_STORAGE} where hash = ? allow filtering`;
  const result = await cassandra.execute(query, [hash]);
  return result.first();
}

async function storeFile(filename, file) {
  if (!filename || !file)
    throw new Error("No filename or file defined");

  const data = fs.readFileSync(file);
  const hash = ethers.utils.keccak256(data);
  const record = await getRecord(hash);
  if (record)
    throw new BadRequestError(`This file is already stored with name '${record.filename}'`);

  const query = `insert into ${TABLE_FILE_STORAGE} (id, filename, hash, data) VALUES (now(), ?, ?, ?)`;
  const params = [filename, hash, data];

  const result = await cassandra.execute(query, params);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when storing the file");
  }
  return {hash, function: "keccak256"};
}

async function readFile(hash) {
  const record = await getRecord(hash);
  if(!record)
    throw new NotFoundError("File not found");

  return record;
}

async function deleteFile(hash) {
  const record = await getRecord(hash);
  if (!record)
    throw new NotFoundError("File not found");

  const query = `delete from ${TABLE_FILE_STORAGE} where hash = ? if exists`;
  const result = await cassandra.execute(query, [hash]);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when deleting the file");
  }
  return;
};

async function getListFiles(q) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  if (q && q["page[size]"]) {
    if (Number(q["page[size]"]) < 0)
      throw new BadRequestError("page[size] must be a positive integer");
    pageSize = q["page[size]"];
  }
  let pageAfter = null;
  if (q && q["page[after]"]) {
    if (Number(q["page[after]"]) < 0)
      throw new BadRequestError("page[after] must be a positive integer");
    pageAfter = q["page[after]"];
  }
  let pageBefore = null;
  if (q && q["page[before]"]) {
    if (Number(q["page[before]"]) < 0)
      throw new BadRequestError("page[before] must be a positive integer");
    pageBefore = q["page[before]"];
  }

  const items = [];

  let query = `select rownum r, hash from ${TABLE_FILE_STORAGE}`;
  if(pageAfter)
    query += ` where r > ${pageAfter} and r <= ${pageAfter + pageSize}`;
  else if(pageBefore)
    query += ` where r < ${pageBefore} and r >= ${pageBefore - pageSize}`;
  else
    query += ` where r < ${pageSize}`;

  const result = await cassandra.execute(query, [hash]);
  console.log(result);

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when deleting the file");
  }
  throw new Error("Not implemented");
}

module.exports = {
  storeFile,
  readFile,
  deleteFile,
  getListFiles,
};
