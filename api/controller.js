const ethers = require("ethers");
const querystring = require("querystring");

const config = require("../config");
const { BadRequestError, NotFoundError, InternalError } = require("../errors");

const URL = "/timestamp/v1/hashes";
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

const provider = new ethers.providers.JsonRpcProvider(config.besu_rpc_node);
const contract = new ethers.Contract(
  config.notary.address,
  config.notary.abi,
  provider
);

async function buildRecord(log) {
  const block = await provider.getBlock(log.blockNumber);
  const timestamp = new Date(block.timestamp).toISOString();
  return {
    hash: log.topics[1].replace("0x", ""),
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    timestamp,
    registeredBy: log.address,
  };
}

function buildLink(before, after, pageSize) {
  const query = {};
  if (before) query["page[before]"] = before;

  if (after) query["page[after]"] = after;

  if (pageSize && pageSize !== config.DEFAULT_PAGE_SIZE)
    query["page[size]"] = pageSize;

  return `${URL}?${querystring.stringify(query)}`;
}

/*
 * Get a list of records
 */
async function getListRecords(query) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  if (query && query["page[size]"]) {
    if (Number.isNaN(Number(query["page[size]"])))
      throw new BadRequestError("page[size] must be an integer");
    pageSize = query["page[size]"];
  }

  const items = [];

  let lastBlockREC = Number(await contract.lastBlockREC());
  const filter = contract.filters.REC();
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < pageSize && lastBlockREC !== 0; i += 1) {
    filter.fromBlock = lastBlockREC;
    filter.toBlock = lastBlockREC;

    const logs = await provider.getLogs(filter);
    const logRec = logs[0];
    const record = await buildRecord(logRec);
    items.push(record);

    lastBlockREC = Number(logRec.topics[3]);
  }
  /* eslint-enable no-await-in-loop */

  const links = {
    first: buildLink(null, null, pageSize),
    prev: buildLink(lastBlockREC, null, pageSize),
    next: buildLink(lastBlockREC, null, pageSize),
    last: buildLink(null, null, pageSize),
  };

  return {
    items,
    total: items.length,
    pageSize,
    links,
  };
}

/*
 * Get record by the document hash
 */
async function getRecord(_hash) {
  let hash = _hash;
  if (!_hash.startsWith("0x")) hash = `0x${_hash}`;

  let registeredBy;
  try {
    registeredBy = await contract.record(hash);
  } catch (error) {
    throw new BadRequestError(error.message);
  }

  if (registeredBy === ADDRESS_ZERO)
    throw new NotFoundError(`Document hash '${_hash}' not found`);

  let lastBlockREC = Number(await contract.lastBlockREC());
  const filter = contract.filters.REC();
  let logRec;
  /* eslint-disable no-await-in-loop */
  while (lastBlockREC !== 0) {
    filter.fromBlock = lastBlockREC;
    filter.toBlock = lastBlockREC;

    const logs = await provider.getLogs(filter);
    [logRec] = logs;

    // check if the hash is in the logs
    if (hash === logRec.topics[1]) break;

    lastBlockREC = Number(logRec.topics[3]);
  }
  /* eslint-enable no-await-in-loop */

  if (lastBlockREC === 0)
    throw new InternalError(
      `Document hash '${hash}' not found, however the NotFoundError was not fired`
    );

  const record = await buildRecord(logRec);

  return record;
}

module.exports = {
  getListRecords,
  getRecord,
};
