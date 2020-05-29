const supertest = require("supertest");
const jose = require("jose");
const ethers = require("ethers");

const config = require("../src/config");
const configTest = require("./config");
const utils = require("../src/utils");

const request = supertest(configTest.url);

const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
const wallet = ethers.Wallet.createRandom();
const r = Math.random().toString(36);
const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
let txId;

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

async function getNotarizeTransaction(hash) {
  const iface = new ethers.utils.Interface(config.notary.abi);
  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: config.notary.address,
    value: 0,
    data: iface.functions.addRecord.encode([hash]),
  };

  return wallet.sign(transaction);
}

async function getDeployTransaction() {
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

/* eslint jest/no-hooks: "off" */
describe("hyperledger Besu integration test", () => {
  beforeAll(async () => {
    const token = jose.JWT.sign({ aud: config.API_NAME }, config.privKeyJWK);
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

  it("getBalance", async () => {
    expect.assertions(1);
    const params = [wallet.address, "latest"];
    await callBesu("eth_getBalance", params)
      .expect("Content-Type", /json/)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(respBesu("0x0"));
      });
  });

  it("getBlockByNumber", async () => {
    expect.assertions(1);
    const params = ["11", true];
    await callBesu("eth_getBlockByNumber", params)
      .expect("Content-Type", /json/)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          respBesu(
            expect.objectContaining({
              number: expect.any(String),
              hash: expect.any(String),
              transactions: expect.arrayContaining([]),
            })
          )
        );
      });
  });

  it("get net_version", async () => {
    expect.assertions(1);
    await callBesu("net_version", [])
      .expect("Content-Type", /json/)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(respBesu(expect.any(String)));
      });
  });

  it("incorrect method is rejected", async () => {
    expect.assertions(0);
    await callBesu("incorrect_method", []).expect(400);
  });

  it("sendRawTransaction without authentication not allowed", async () => {
    expect.assertions(0);
    await callBesu("eth_sendRawTransaction", ["0x000"]).expect(401);
  });

  it("notarize a hash (sendRawTransaction + auth)", async () => {
    expect.assertions(1);
    const sgnTx = await getNotarizeTransaction(randomHash);
    await callBesuAuth("eth_sendRawTransaction", [sgnTx])
      .expect("Content-Type", /json/)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(respBesu(expect.any(String)));
        txId = response.body.result;
      });
  });

  it("check good receipt after 2 seconds", async () => {
    expect.assertions(2);
    await utils.sleep(2000);
    await callBesuAuth("eth_getTransactionReceipt", [txId])
      .expect("Content-Type", /json/)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          respBesu(
            expect.objectContaining({
              blockHash: expect.any(String),
              blockNumber: expect.any(String),
              from: expect.any(String),
            })
          )
        );
        const from = response.body.result.from.toLowerCase();
        expect(from).toBe(wallet.address.toLowerCase());
      });
  });

  it("reject the deployment of a new smart contract", async () => {
    expect.assertions(0);
    const sgnTx = await getDeployTransaction();
    await callBesuAuth("eth_sendRawTransaction", [sgnTx]).expect(403);
  });

  it("reject invalid url", async () => {
    expect.assertions(0);
    await request.get("/ledger/v1/bad-url").expect(400);
  });
});
