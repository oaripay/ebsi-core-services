const supertest = require("supertest");
const ethers = require("ethers");
const Web3 = require("web3");
const { Agent, Scope } = require("@cef-ebsi/app-jwt");

const config = require("../../src/config");
const { url, TEST_APP_NAME, privKey } = require("../config");
const utils = require("../../src/utils");
const Server = require("../../src/server");

let request;
let server = null;
if (url) {
  request = supertest(url);
} else {
  server = new Server().getServer();
  request = supertest(server);
}

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
  const ethersChainId = ethers.BigNumber.from(chainId).toNumber();
  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    from: wallet.address,
    to: notary.address,
    value: 0,
    data: iface.encodeFunctionData("addRecord", [hash]),
    chainId: ethersChainId,
  };
  return wallet.signTransaction(transaction);
}

async function getDeployTransaction() {
  const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
  const wallet = ethers.Wallet.createRandom();

  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    from: wallet.address,
    to: "0x0000000000000000000000000000000000000000",
    value: 0,
    data: "0x12345678901234567890",
  };

  return wallet.signTransaction(transaction);
}

/* eslint jest/no-hooks: "off" */
describe("hyperledger Besu integration test", () => {
  it("create a new session with ledger api", async () => {
    expect.assertions(1);
    const agent = new Agent(Scope.COMPONENT, privKey, {
      issuer: TEST_APP_NAME,
    });
    const requestToken = await agent.createRequestPayload("ebsi-ledger");
    await request
      .post("/ledger/v1/sessions")
      .send(requestToken)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            accessToken: expect.any(String),
            tokenType: "Bearer",
            expiresIn: 900,
            issuedAt: expect.any(Number),
          })
        );
        const token = response.body.accessToken;
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
    const privKey1 = Web3.utils.randomHex(32);
    const hash =
      "0x1e2ff5cb7ab5c7e3f5737dd1f0d2f2d0b3222d75327d70411e7645eef0aefd04";
    const from = web3.eth.accounts.privateKeyToAccount(privKey1).address;
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
      privKey1
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
});
