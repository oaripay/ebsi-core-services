const axios = require("axios");

const config = require("./config");
const utils = require("./utils");
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalError,
} = require("./errors");

const anonymousAccess = { enabled: true, requireAuth: false };
const authAccess = { enabled: true, requireAuth: true };
const disabled = { enabled: false };

const methods = {
  web3_clientVersion: anonymousAccess,
  web3_sha3: anonymousAccess,
  net_version: anonymousAccess,
  net_peerCount: authAccess,
  net_listening: authAccess,
  eth_protocolVersion: anonymousAccess,
  eth_syncing: authAccess,
  eth_coinbase: anonymousAccess,
  eth_mining: authAccess,
  eth_hashrate: anonymousAccess,
  eth_gasPrice: anonymousAccess,
  eth_accounts: authAccess,
  eth_blockNumber: anonymousAccess,
  eth_getBalance: anonymousAccess,
  eth_getStorageAt: anonymousAccess,
  eth_getTransactionCount: anonymousAccess,
  eth_getBlockTransactionCountByHash: anonymousAccess,
  eth_getBlockTransactionCountByNumber: anonymousAccess,
  eth_getUncleCountByBlockHash: anonymousAccess,
  eth_getUncleCountByBlockNumber: anonymousAccess,
  eth_getCode: anonymousAccess,
  eth_sign: authAccess,
  eth_sendTransaction: disabled,
  eth_sendRawTransaction: authAccess,
  eth_call: anonymousAccess,
  eth_chainId: anonymousAccess,
  eth_estimateGas: authAccess,
  eth_getBlockByHash: anonymousAccess,
  eth_getBlockByNumber: anonymousAccess,
  eth_getTransactionByHash: anonymousAccess,
  eth_getTransactionByBlockHashAndIndex: anonymousAccess,
  eth_getTransactionByBlockNumberAndIndex: anonymousAccess,
  eth_getTransactionReceipt: anonymousAccess,
  eth_pendingTransactions: anonymousAccess,
  eth_getUncleByBlockHashAndIndex: anonymousAccess,
  eth_getUncleByBlockNumberAndIndex: anonymousAccess,
  eth_getCompilers: disabled,
  eth_compileLLL: disabled,
  eth_compileSolidity: disabled,
  eth_compileSerpent: disabled,
  eth_newFilter: anonymousAccess,
  eth_newBlockFilter: anonymousAccess,
  eth_newPendingTransactionFilter: anonymousAccess,
  eth_uninstallFilter: anonymousAccess,
  eth_getFilterChanges: anonymousAccess,
  eth_getFilterLogs: anonymousAccess,
  eth_getLogs: anonymousAccess,
  eth_getWork: anonymousAccess,
  eth_submitWork: authAccess,
  eth_submitHashrate: authAccess,
  eth_getProof: anonymousAccess,
  db_putString: disabled,
  db_getString: disabled,
  db_putHex: disabled,
  db_getHex: disabled,
  shh_post: disabled,
  shh_version: disabled,
  shh_newIdentity: disabled,
  shh_hasIdentity: disabled,
  shh_newGroup: disabled,
  shh_addToGroup: disabled,
  shh_newFilter: disabled,
  shh_uninstallFilter: disabled,
  shh_getFilterChanges: disabled,
  shh_getMessages: disabled,
};

async function besuRPC(query, authenticated) {
  if (!query || !query.method || !query.params) {
    throw new BadRequestError("Not method or params defined");
  }

  const method = methods[query.method];

  if (!method)
    throw new BadRequestError(`The method '${query.method}' does not exist`);

  if (!method.enabled)
    throw new BadRequestError(
      `The method '${query.method}' is currently disabled`
    );

  if (!authenticated && method.requireAuth)
    throw new UnauthorizedError(
      `The method '${query.method}' is not available for anonymous access`
    );

  if (utils.isDeployingSmartContract(query))
    throw new ForbiddenError(
      "Deployment of new smart contracts is not allowed"
    );

  let result;
  try {
    result = await axios.post(config.besuRPCNode, query);
  } catch (error) {
    const { status, data } = error.response;
    let message;
    if (typeof data === "object") message = JSON.stringify(data);
    else message = data;

    if (status >= 500)
      throw new InternalError(
        `Internal error from Besu RPC ${config.besuRPCNode}. ${message}`
      );
    else throw new BadRequestError(`Besu RPC Error: ${message}`);
  }

  return result;
}

module.exports = {
  besuRPC,
};
