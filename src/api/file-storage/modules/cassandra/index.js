const fs = require("fs");
const ethers = require("ethers");
const querystring = require("querystring");

const config = require("../../../../config");
const cassandra = require("../../../../cassandraClient");
const logger = require("../../../../logger");
const { BadRequestError, NotFoundError } = require("../../../../errors");

const TABLE_FILE_STORAGE = "file_storage";

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

function buildLink(after, size) {
  const query = {};

  if (size && size !== config.DEFAULT_PAGE_SIZE) query["page[size]"] = size;
  if (after) query["page[after]"] = after;

  return `/storage/v1/stores/distributed/files?${querystring.stringify(query)}`;
}

async function getListFiles(q) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  let pageAfter;
  if (q && q.page) {
    const { page } = q;
    if (page.size) pageSize = parseInt(page.size, 10);
    if (page.after) pageAfter = page.after;
  }

  const query = `select id, hash from ${TABLE_FILE_STORAGE}`;
  const params = [];

  const opts = { prepare: true, fetchSize: pageSize };
  if (pageAfter) opts.pageState = pageAfter;
  const result = await cassandra.execute(query, params, opts);
  const { pageState } = result;

  if (!result.info || !result.info.isSchemaInAgreement) {
    logger.error(result);
    throw new Error("Bad response from cassandra when querying");
  }

  const items = result.rows.map((r) => r.hash);

  const links = { first: buildLink(null, pageSize) };

  if (pageState) links.next = buildLink(pageState, pageSize);
  else links.last = buildLink(pageAfter, pageSize);

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
