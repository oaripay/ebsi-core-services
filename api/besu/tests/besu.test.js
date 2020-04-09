var ethers = require("ethers");
var jose = require("jose");
require("dotenv").config();

var { sleep, axios2 } = require("./utils");
var config = require("./config");

var wallet, provider;
var token, badToken, selfToken;
var randomHash, txId;

/*
 * Initialization
 */

beforeAll(() => {
  // wallet and provider
  provider = new ethers.providers.JsonRpcProvider(config.api.besu);
  wallet = ethers.Wallet.createRandom();

  // Self token for login
  var payload = {
    iss: config.app_name,
    aud: "ebsi-besu"
  };
  var key = config.private_key;
  selfToken = jose.JWT.sign(payload, key, { expiresIn: "15 minutes" });
  badToken = selfToken;

  // Random hash
  var r = Math.random().toString(36);
  randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
});

/*
 * Tests
 */

test("Ping to Besu API", async () => {
  var response = await callBesuAPI();
  expect(response).toBeDefined();
});

test("Ping to Notary API - get contract info", async () => {
  var response = await axios2.get(config.api.notary);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    expect.objectContaining({
      notary: expect.objectContaining({
        address: expect.any(String),
        abi: expect.arrayContaining([])
      })
    })
  );
});

test("getBalance", async () => {
  var response = await callBesuAPI("eth_getBalance", [
    wallet.address,
    "latest"
  ]);
  expect(response.status).toEqual(200);
  expect(response.data).toEqual(respBesu("0x0"));
});

test("getBlockByNumber", async () => {
  var response = await callBesuAPI("eth_getBlockByNumber", ["11", true]);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    respBesu(
      expect.objectContaining({
        number: expect.any(String),
        hash: expect.any(String),
        transactions: expect.arrayContaining([])
      })
    )
  );
});

test("Get net_version", async () => {
  var response = await callBesuAPI("net_version", []);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(respBesu(expect.any(String)));
});

test("incorrect_method is rejected", async () => {
  var response = await callBesuAPI("incorrect_method", []);
  expect(response.status).toBe(400);
});

test("sendRawTransaction without authentication not allowed", async () => {
  var response = await callBesuAPI("eth_sendRawTransaction", ["0x000"]);
  expect(response.status).toBe(403);
});

test("sendRawTransaction with bad auth is rejected", async () => {
  var response = await callBesuAPI(
    "eth_sendRawTransaction",
    ["0x000"],
    badToken
  );
  expect(response.status).toBe(403);
});

test("Login in Besu API", async () => {
  var response = await _login(selfToken);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    expect.objectContaining({
      token: expect.any(String)
    })
  );
  token = response.data.token;
});

test("Read an empty hash using the Notary API", async () => {
  var response = await axios2.get(config.api.notary + "/" + randomHash);
  expect(response.status).toBe(404);
});

test("Notarize a hash (sendRawTransaction + auth)", async () => {
  var sgnTx = await getNotarizeTransaction(randomHash);
  var response = await callBesuAPI("eth_sendRawTransaction", [sgnTx], token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(respBesu(expect.any(String)));
  txId = response.data.result;
});

test("Check good receipt after 2 seconds", async () => {
  await sleep(2000);
  var response = await callBesuAPI("eth_getTransactionReceipt", [txId]);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    respBesu(
      expect.objectContaining({
        blockHash: expect.any(String),
        blockNumber: expect.any(String),
        from: expect.any(String)
      })
    )
  );
  var from = response.data.result.from.toLowerCase();
  expect(from).toBe(wallet.address.toLowerCase());
});

test("Read the notarized hash using the Notary API", async () => {
  var response = await axios2.get(config.api.notary + "/" + randomHash);
  expect(response.status).toBe(200);
  expect(response.data).toEqual({
    hash: randomHash,
    timestamp: expect.any(Number),
    registeredBy: expect.any(String),
    blockNumber: expect.any(Number)
  });
  expect(response.data.timestamp).not.toBe("0");
  var registeredBy = response.data.registeredBy.toLowerCase();
  expect(registeredBy).toBe(wallet.address.toLowerCase());
});

test("Reject the deployment of a new smart contract", async () => {
  var sgnTx = await getDeployTransaction();
  var response = await callBesuAPI("eth_sendRawTransaction", [sgnTx], token);
  expect(response.status).toBe(403);
});

/*
 * Functions
 */

function respBesu(result) {
  return expect.objectContaining({
    jsonrpc: "2.0",
    id: expect.any(Number),
    result: result
  });
}

function _login(token) {
  return axios2.get(config.api.besu + "/login", token);
}

function callBesuAPI(method, params, token) {
  var data = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1
  };
  return axios2.post(config.api.besu, data, token);
}

async function getNotarizeTransaction(hash) {
  var response = await axios2.get(config.api.notary);
  var notary = response.data.notary;
  var iface = new ethers.utils.Interface(notary.abi);
  var transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: notary.address,
    value: 0,
    data: iface.functions.addRecord.encode([hash])

    // This ensures the transaction cannot be replayed on different networks
    // chainId: provider.chainId
  };

  return wallet.sign(transaction);
}

async function getDeployTransaction() {
  var transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: "0x0000000000000000000000000000000000000000",
    value: 0,
    data: "0x12345678901234567890"
  };

  return wallet.sign(transaction);
}
