const ethers = require("ethers");
const querystring = require("querystring");
const config = require("../config");
const { BadRequestError, NotFoundError } = require("../errors");

const URL = "/timestamp/v1/hashes";
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
const contract = new ethers.Contract(
  config.notary.address,
  config.notary.abi,
  provider
);

async function buildRecord(log) {
  const block = await provider.getBlock(log.blockNumber);
  const timestamp = new Date(block.timestamp * 1000).toISOString();
  return {
    hash: log.topics[1].replace("0x", ""),
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    timestamp,
    registeredBy: log.topics[2].replace("000000000000000000000000", ""),
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
 * Function to walk around all the records in the contract
 * starting from the last one. On each iteration a
 * callback function is executed.
 * The loop stops if the callback returns true.
 */
async function iterateContract(callback) {
  let lastBlockREC = Number(await contract.lastBlockREC());
  const filter = contract.filters.REC();
  let logRec = null;

  /* eslint-disable no-await-in-loop */
  while (lastBlockREC !== 0) {
    filter.fromBlock = lastBlockREC;
    filter.toBlock = lastBlockREC;

    const logs = await provider.getLogs(filter);
    let exitLoop = false;
    for (let i = 0; i < logs.length && !exitLoop; i += 1) {
      const finished = await callback(logs[i]);
      if (finished) {
        exitLoop = true;
        logRec = logs[i];
      }
    }
    if (exitLoop) break;

    lastBlockREC = Number(logs[0].topics[3]);
  }
  /* eslint-enable no-await-in-loop */

  return { lastBlockREC, logRec };
}

/*
 * Get a list of records
 */
async function getListRecords(q) {
  let pageSize = config.DEFAULT_PAGE_SIZE;
  if (q && q.page) {
    const { page } = q;
    if (page.size) pageSize = parseInt(page.size, 10);
  }

  const items = [];

  const { lastBlockREC } = await iterateContract(async (log) => {
    const record = await buildRecord(log);
    items.push(record);
    if (items.length < pageSize) return false; // continue
    return true;
  });

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
  let hash = _hash.toLowerCase();
  if (!hash.startsWith("0x")) hash = `0x${hash}`;

  let registeredBy;
  try {
    registeredBy = await contract.record(hash);
  } catch (error) {
    throw new BadRequestError(BadRequestError.defaultTitle, {
      detail: error.message,
    });
  }

  if (registeredBy === ADDRESS_ZERO)
    throw new NotFoundError(NotFoundError.defaultTitle, {
      detail: `Document hash '${_hash}' not found`,
    });

  const { logRec, lastBlockREC } = await iterateContract((log) => {
    if (hash === log.topics[1].toLowerCase()) return true;
    return false; // continue searching
  });

  if (lastBlockREC === 0)
    throw new Error(
      `Document hash '${hash}' not found, however the NotFoundError was not fired`
    );

  const record = await buildRecord(logRec);

  return record;
}

module.exports = {
  getListRecords,
  getRecord,
};
