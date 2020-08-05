const supertest = require("supertest");
const axios = require("axios");
const jose = require("jose");
const ethers = require("ethers");
const Web3 = require("web3");

const config = require("../../src/config");
const utils = require("../../src/utils");
const Server = require("../../src/server");

const { InternalServerError } = require("../../src/errors");

const server = new Server().getServer();
const request = supertest(server);

const { notary } = config;
let chainId;

const callBesu = (method, params) => {
  return request
    .post("/ledger/v1/blockchains/besu")
    .set("Accept", "application/json")
    .send({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    });
};

let callBesuAuth;

/*
 * Functions
 */

function respBesu(result) {
  return expect.objectContaining({
    jsonrpc: "2.0",
    id: expect.any(Number),
    result,
  });
}

async function buildTxNotaryWithEthers(hash) {
  const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
  const wallet = ethers.Wallet.createRandom();
  const iface = new ethers.utils.Interface(notary.abi);

  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: notary.address,
    value: 0,
    data: iface.functions.addRecord.encode([hash]),
    chainId,
  };
  return wallet.sign(transaction);
}

async function getDeployTransaction() {
  const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
  const wallet = ethers.Wallet.createRandom();

  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: "0x0000000000000000000000000000000000000000",
    value: 0,
    data: "0x12345678901234567890",
  };

  return wallet.sign(transaction);
}

describe("hyperledger Besu integration test", () => {
  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const token = jose.JWT.sign({ aud: config.API_NAME }, config.privKey);
    callBesuAuth = (method, params) => {
      return request
        .post("/ledger/v1/blockchains/besu")
        .set("Accept", "application/json")
        .set("Authorization", `Bearer ${token}`)
        .send({
          jsonrpc: "2.0",
          method,
          params,
          id: 1,
        });
    };
  });

  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws internal error when the chainId can not be read", async () => {
    expect.assertions(2);

    jest.mock("axios");
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("error with connection");
    });

    /* The first time eth_sendRawTransaction is called the API will consult the
     * chainId from the blockchain in order to parse the transaction. If it fails
     * then an internal error is returned.
     * This is just the first time. The API will take it from the memory in
     * the following calls.
     */
    const response = await callBesuAuth("eth_sendRawTransaction", [""]);
    expect(response.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error"),
      type: "about:blank",
    });
    expect(response.status).toBe(500);

    axios.post.mockRestore();
    jest.unmock("axios");
  });

  it("getChainId", async () => {
    expect.assertions(2);
    const response = await callBesu("eth_chainId", []);
    expect(response.body).toStrictEqual(respBesu(expect.any(String)));
    expect(response.status).toBe(200);
    chainId = response.body.result;
  });

  it("getBalance", async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();
    const params = [wallet.address, "latest"];
    const response = await callBesu("eth_getBalance", params);
    expect(response.body).toStrictEqual(respBesu("0x0"));
    expect(response.status).toBe(200);
  });

  it("getBlockByNumber", async () => {
    expect.assertions(2);
    const params = ["11", true];
    const response = await callBesu("eth_getBlockByNumber", params);
    expect(response.body).toStrictEqual(
      respBesu(
        expect.objectContaining({
          number: expect.any(String),
          hash: expect.any(String),
          transactions: expect.arrayContaining([]),
        })
      )
    );
    expect(response.status).toBe(200);
  });

  it("get net_version", async () => {
    expect.assertions(2);
    const response = await callBesu("net_version", []);
    expect(response.body).toStrictEqual(respBesu(expect.any(String)));
    expect(response.status).toBe(200);
  });

  it("incorrect method is rejected", async () => {
    expect.assertions(2);
    const response = await callBesu("incorrect_method", []);
    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: expect.stringContaining("'incorrect_method' does not exist"),
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("sendRawTransaction without authentication not allowed", async () => {
    expect.assertions(2);
    const response = await callBesu("eth_sendRawTransaction", ["0x000"]);
    expect(response.body).toStrictEqual({
      title: "Unauthorized",
      status: 401,
      detail: expect.stringContaining("not available for anonymous access"),
      type: "about:blank",
    });
    expect(response.status).toBe(401);
  });

  it("notarize a hash (sendRawTransaction + auth)", async () => {
    expect.assertions(4);
    const r = Math.random().toString(36);
    const hash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
    const sgnTx = await buildTxNotaryWithEthers(hash);
    const response = await callBesuAuth("eth_sendRawTransaction", [sgnTx]);
    expect(response.body).toStrictEqual(respBesu(expect.any(String)));
    expect(response.status).toBe(200);

    const txId = response.body.result;

    await utils.sleep(2000);
    const responseReceipt = await callBesuAuth("eth_getTransactionReceipt", [
      txId,
    ]);
    expect(responseReceipt.body).toStrictEqual(
      respBesu(
        expect.objectContaining({
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          from: expect.any(String),
        })
      )
    );
    expect(responseReceipt.status).toBe(200);
  });

  it("throws bad request error for a different chain id", async () => {
    expect.assertions(2);

    const provider = new Web3.providers.HttpProvider(config.besuRPCNode);
    const web3 = new Web3(provider);
    const privKey = Web3.utils.randomHex(32);
    const hash =
      "0x1e2ff5cb7ab5c7e3f5737dd1f0d2f2d0b3222d75327d70411e7645eef0aefd04";
    const from = web3.eth.accounts.privateKeyToAccount(privKey).address;
    const contract = new web3.eth.Contract(notary.abi, notary.address);

    const transaction = {
      nonce: await web3.eth.getTransactionCount(from, "pending"),
      gasLimit: web3.utils.numberToHex(221000),
      gasPrice: "0x0",
      to: notary.address,
      value: "0x0",
      data: contract.methods.addRecord(hash).encodeABI(),
      chainId: 9999, // unknown chain id
    };
    const signed = await web3.eth.accounts.signTransaction(
      transaction,
      privKey
    );
    const response = await callBesuAuth("eth_sendRawTransaction", [
      signed.rawTransaction,
    ]);
    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: expect.stringContaining("Invalid chain id"),
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("reject the deployment of a new smart contract", async () => {
    expect.assertions(2);
    const sgnTx = await getDeployTransaction();
    const response = await callBesuAuth("eth_sendRawTransaction", [sgnTx]);
    expect(response.body).toStrictEqual({
      title: "Forbidden",
      status: 403,
      detail: "Deployment of new smart contracts is not allowed",
      type: "about:blank",
    });
    expect(response.status).toBe(403);
  });

  it("reject invalid url", async () => {
    expect.assertions(2);
    const response = await request.get("/ledger/v1/bad-url");
    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: "Invalid service '/ledger/v1/bad-url'",
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("handle internal error", async () => {
    expect.assertions(4);

    jest.mock("axios");
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("error with connection");
    });

    const response1 = await callBesu("net_version", []);
    expect(response1.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error"),
      type: "about:blank",
    });
    expect(response1.status).toBe(500);

    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new InternalServerError("internal error");
    });

    const response2 = await callBesu("net_version", []);
    expect(response2.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error"),
      type: "about:blank",
    });
    expect(response2.status).toBe(500);

    axios.post.mockRestore();
  });
});
