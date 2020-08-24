const querystring = require("querystring");
const FabricClient = require("fabric-client");
const {
  NotFoundError,
  BadRequestError,
} = require("@cef-ebsi/problem-details-errors");

const config = require("../../config");
const connectionProfile = require("../../connectionProfileFabric");

const client = FabricClient.loadFromConfig(connectionProfile);

function assertChannelExists(channelId) {
  if (!connectionProfile.channels[channelId])
    throw new NotFoundError("Channel not found", {
      detail: `Channel '${channelId}' not found`,
    });
}

function getPagination(query) {
  const page = {
    size: config.DEFAULT_PAGE_SIZE,
    after: null,
  };

  if (!query || !query.page) return page;

  if (query.page.size) {
    page.size = parseInt(query.page.size, 10);
    if (Number.isNaN(page.size) || page.size <= 0)
      throw new BadRequestError("Invalid params", {
        detail: `page[size] must be an integer greater than 0. Received: ${query.page.size}`,
      });
  }

  if (query.page.after) page.after = query.page.after;

  return page;
}

function encodePageAfter(blockNumber, txId) {
  if (txId) return Number(blockNumber).toString(10) + txId;
  return Number(blockNumber).toString(10);
}

function decodePageAfter(after) {
  let blockString = null;
  let txId = null;
  if (after.length <= 64) blockString = after;
  else {
    blockString = after.substring(0, after.length - 64);
    txId = after.replace(blockString, "");
  }

  const blockNumber = parseInt(blockString, 10);

  if (Number.isNaN(blockNumber) || blockNumber < 0)
    throw new BadRequestError("Invalid params", {
      detail: `page[after] must contain a blockNumber greater or equal to 0. Received: ${blockString}`,
    });

  return { blockNumber, txId };
}

function buildLink(path, page) {
  const query = {};
  if (page.size && page.size !== config.DEFAULT_PAGE_SIZE)
    query["page[size]"] = page.size;
  query["page[after]"] = page.after;

  return `/ledger/v1/blockchains/fabric/channels${path}?${querystring.stringify(
    query
  )}`;
}

function buildLinks(path, size, pageAfter) {
  const links = {};
  links.first = buildLink(path, { size, after: pageAfter.first });
  if (pageAfter.next !== null)
    links.next = buildLink(path, { size, after: pageAfter.next });
  if (pageAfter.prev !== null)
    links.prev = buildLink(path, { size, after: pageAfter.prev });
  if (pageAfter.last !== null)
    links.last = buildLink(path, { size, after: pageAfter.last });

  return links;
}

function parseBlock(block, channelId) {
  const timestamp =
    block.data.data.length > 0
      ? block.data.data[0].payload.header.channel_header.timestamp
      : // todo: how to get timestamp when there are no txs
        null;

  return {
    blocknum: Number(block.header.number),
    channelId,
    timestamp,
    creatorsMspId: block.metadata.metadata[0].signatures.map((sig) => {
      return sig.signature_header.creator.Mspid;
    }),
    dataHash: block.header.data_hash,
    prevHash: block.header.previous_hash,
    txIds: block.data.data.map((tx) => {
      return tx.payload.header.channel_header.tx_id;
    }),
  };
}

function parseTransactions(block) {
  const transactions = block.data.data.map((tx) => {
    return {
      txId: tx.payload.header.channel_header.tx_id,
      type: tx.payload.header.channel_header.typeString,
      timestamp: tx.payload.header.channel_header.timestamp,
      channelId: tx.payload.header.channel_header.channel_id,
      creatorMspId: tx.payload.header.signature_header.creator.Mspid,
      blocknum: Number(block.header.number),
      ...(tx.payload.data.actions && {
        actions: tx.payload.data.actions.map((action) => {
          return {
            creatorMspId: action.header.creator.Mspid,
            chaincodeId:
              action.payload.chaincode_proposal_payload.input.chaincode_spec
                .chaincode_id.name,
            proposalHash:
              action.payload.action.proposal_response_payload.proposal_hash,
            response:
              action.payload.action.proposal_response_payload.extension
                .response,
            endorsersMspId: action.payload.action.endorsements.map(
              (endorsement) => {
                return endorsement.endorser.Mspid;
              }
            ),
          };
        }),
      }),
    };
  });
  return transactions;
}

async function getChannel(channelId) {
  assertChannelExists(channelId);
  return connectionProfile.channels[channelId];
}

async function getBlock(channelId, blockNumberString) {
  assertChannelExists(channelId);
  const channel = client.getChannel(channelId);
  const blockNumber = parseInt(blockNumberString, 10);

  try {
    const block = await channel.queryBlock(blockNumber, null, true, false);
    return parseBlock(block, channelId);
  } catch (error) {
    throw new NotFoundError("Block not found", {
      detail: error.message,
    });
  }
}

async function getTransaction(channelId, txId) {
  assertChannelExists(channelId);
  const channel = client.getChannel(channelId);

  try {
    const transaction = await channel.queryTransaction(txId, null, true, false);
    return transaction;
  } catch (error) {
    throw new NotFoundError("Transaction not found", {
      detail: error.message,
    });
  }
}

async function getChannels(query) {
  const items = Object.keys(connectionProfile.channels);
  const page = getPagination(query);

  const pageAfter = {
    first: 0,
    prev: 0,
    next: 0,
    last: 0,
  };

  const links = buildLinks("/", page.size, pageAfter);

  return {
    items,
    total: items.length,
    pageSize: page.size,
    links,
  };
}

async function getBlocks(channelId, query) {
  assertChannelExists(channelId);
  const page = getPagination(query);
  const channel = client.getChannel(channelId);
  const info = await channel.queryInfo(null, true);
  const height = parseInt(info.height, 10) - 1;

  let iniBlock = height;
  if (page.after) {
    iniBlock = decodePageAfter(page.after).blockNumber;
  }

  let endBlock = iniBlock - page.size + 1;
  if (endBlock < 0) endBlock = 0;

  const items = [];
  /* eslint-disable no-await-in-loop */
  for (let blockNumber = iniBlock; blockNumber >= endBlock; blockNumber -= 1) {
    let block;
    try {
      block = await channel.queryBlock(blockNumber, null, true, false);
    } catch (error) {
      throw new NotFoundError("Block not found", {
        detail: error.message,
      });
    }
    items.push(parseBlock(block, channelId));
  }
  /* eslint-enable no-await-in-loop */

  const pageAfter = {
    first: height,
    prev: iniBlock + page.size > height ? height : iniBlock + page.size,
    next: endBlock === 0 ? 0 : endBlock - 1,
    last: page.size - 1,
  };

  const links = buildLinks(`/${channelId}/blocks`, page.size, pageAfter);

  return {
    items,
    total: height + 1,
    pageSize: page.size,
    links,
  };
}

async function getTransactions(channelId, query) {
  assertChannelExists(channelId);
  const page = getPagination(query);
  const channel = client.getChannel(channelId);
  const info = await channel.queryInfo(null, true);
  const height = parseInt(info.height, 10) - 1;

  let iniBlock = height;
  let iniTx = null;
  if (page.after) {
    const { blockNumber, txId } = decodePageAfter(page.after);
    iniBlock = blockNumber;
    iniTx = txId;
  }

  const items = [];

  /* eslint-disable no-await-in-loop */
  let blockNumber;
  for (
    blockNumber = iniBlock;
    items.length < page.size + 1 && blockNumber >= 0;
    blockNumber -= 1
  ) {
    let block;
    try {
      block = await channel.queryBlock(blockNumber, null, true, false);
    } catch (error) {
      throw new NotFoundError("Transaction not found", {
        detail: error.message,
      });
    }
    const transactions = parseTransactions(block);

    if (iniTx && blockNumber === iniBlock) {
      // delete transactions before iniTx
      const index = transactions.findIndex((t) => t.txId === iniTx);
      const deleteCount = index;
      transactions.splice(0, deleteCount);
    }

    if (items.length + transactions.length > page.size + 1) {
      // add no more than page.size+1 transactions
      const deleteCount = items.length + transactions.length - page.size - 1;
      transactions.splice(transactions.length - deleteCount, deleteCount);
    }

    items.splice(items.length, 0, ...transactions);
  }
  /* eslint-enable no-await-in-loop */
  blockNumber += 1;

  let next = null;
  let last = null;
  const prev = null;
  if (items.length === page.size + 1) {
    // remove the last tx and define it as the next one
    const [nextTx] = items.splice(items.length - 1, 1);
    next = encodePageAfter(nextTx.blocknum, nextTx.txId);
  } else if (items.length > 0) {
    // this is the last page and there are items
    last = encodePageAfter(items[0].blocknum, items[0].txId);
  } else {
    // this is the last page without items
    last = encodePageAfter(blockNumber);
  }

  const pageAfter = {
    first: encodePageAfter(height),
    prev,
    next,
    last,
  };

  const links = buildLinks(`/${channelId}/transactions`, page.size, pageAfter);

  return {
    items,
    total: height + 1, // todo: only valid for one tx per block
    pageSize: page.size,
    links,
  };
}

module.exports = {
  getChannels,
  getChannel,
  getBlocks,
  getBlock,
  getTransactions,
  getTransaction,
};
