var express = require("express");
var bodyParser = require("body-parser");
var axios = require("axios");
var swaggerUi = require("swagger-ui-express");
const debug = require("debug")("http-body");
var router = express.Router();

var config = require("../../config");
var utils = require("../../utils");
var apiAuth = require("../../apiAuth");
var swaggerDocument = require("../swagger/swagger-besu.json");

router.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));
router.use("/", apiAuth.handleToken(config.BESU_API_NAME));
router.get("/swagger.json", (req, res) => res.send(swaggerDocument));
router.use("/api-docs", swaggerUi.serve, (...args) =>
  swaggerUi.setup(swaggerDocument)(...args)
);
router.get("/login", apiAuth.login(config.BESU_API_NAME));

const anonymous_access = { enabled: true, role: null };
const auth_access = { enabled: true, role: "besu" };
const disabled = { enabled: false, role: null };

var methods = {
  web3_clientVersion: anonymous_access,
  web3_sha3: anonymous_access,
  net_version: anonymous_access,
  net_peerCount: auth_access,
  net_listening: auth_access,
  eth_protocolVersion: anonymous_access,
  eth_syncing: auth_access,
  eth_coinbase: anonymous_access,
  eth_mining: auth_access,
  eth_hashrate: anonymous_access,
  eth_gasPrice: anonymous_access,
  eth_accounts: auth_access,
  eth_blockNumber: anonymous_access,
  eth_getBalance: anonymous_access,
  eth_getStorageAt: anonymous_access,
  eth_getTransactionCount: anonymous_access,
  eth_getBlockTransactionCountByHash: anonymous_access,
  eth_getBlockTransactionCountByNumber: anonymous_access,
  eth_getUncleCountByBlockHash: anonymous_access,
  eth_getUncleCountByBlockNumber: anonymous_access,
  eth_getCode: anonymous_access,
  eth_sign: auth_access,
  eth_sendTransaction: disabled,
  eth_sendRawTransaction: auth_access,
  eth_call: anonymous_access,
  eth_chainId: anonymous_access,
  eth_estimateGas: auth_access,
  eth_getBlockByHash: anonymous_access,
  eth_getBlockByNumber: anonymous_access,
  eth_getTransactionByHash: anonymous_access,
  eth_getTransactionByBlockHashAndIndex: anonymous_access,
  eth_getTransactionByBlockNumberAndIndex: anonymous_access,
  eth_getTransactionReceipt: anonymous_access,
  eth_pendingTransactions: anonymous_access,
  eth_getUncleByBlockHashAndIndex: anonymous_access,
  eth_getUncleByBlockNumberAndIndex: anonymous_access,
  eth_getCompilers: disabled,
  eth_compileLLL: disabled,
  eth_compileSolidity: disabled,
  eth_compileSerpent: disabled,
  eth_newFilter: anonymous_access,
  eth_newBlockFilter: anonymous_access,
  eth_newPendingTransactionFilter: anonymous_access,
  eth_uninstallFilter: anonymous_access,
  eth_getFilterChanges: anonymous_access,
  eth_getFilterLogs: anonymous_access,
  eth_getLogs: anonymous_access,
  eth_getWork: anonymous_access,
  eth_submitWork: auth_access,
  eth_submitHashrate: auth_access,
  eth_getProof: anonymous_access,
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
  shh_getMessages: disabled
};

router.post("/", function(req, res) {
  debug(req.body);
  var query = req.body;

  if (!(query && query.method && query.params)) {
    res.status(400).send("Bad request");
    return;
  }

  var method = methods[query.method];

  (async () => {
    try {
      if (method) {
        if (method.enabled) {
          if (method.role == null) {
            //anonymous read
            var result = await axios.post(config.besu_rpc_node, query);
            res.send(result.data);
          } else if (method.role == "besu") {
            //authenticated user
            if (req.user) {
              if (req.user.aud === config.BESU_API_NAME) {
                if (utils.isDeployingSmartContract(query)) {
                  res
                    .status(403)
                    .send(`Deployment of new smart contracts is not allowed`);
                } else {
                  var result2 = await axios.post(config.besu_rpc_node, query);
                  res.send(result2.data);
                }
              } else {
                res
                  .status(403)
                  .send(
                    `The method '${query.method}' needs 'besu' permissions`
                  );
              }
            } else {
              res
                .status(403)
                .send(
                  `The method '${query.method}' is not available for anonymous access`
                );
            }
          } else {
            res.status(501).send(`Internal error`);
            console.log(
              `The role '${method.role}' is not implemented for the method '${query.method}'`
            );
          }
        } else {
          res
            .status(400)
            .send(`The method '${query.method}' is currently disabled`);
        }
      } else {
        res.status(400).send(`The method '${query.method}' does not exist`);
      }
    } catch (error) {
      if (error.response)
        res.status(error.response.status).send(error.response.data);
      else {
        res.status(500).send("Internal error");
        console.log(error);
      }
    }
  })();
});

module.exports = router;
