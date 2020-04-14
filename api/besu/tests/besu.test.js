const ethers = require("ethers");
const jose = require("jose");
require("dotenv").config();

const config = require("../config");
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} = require("../errors");
const utils = require("../utils");
const auth = require("../auth");
const controller = require("../controller");

const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
const wallet = ethers.Wallet.createRandom();
const r = Math.random().toString(36);
const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));

const ANONYMOUS = false;

let txId;

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

function callAPI(method, params, authenticated = true) {
  const data = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };
  return controller.besuRPC(data, authenticated);
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

/*
 * Tests
 */

describe("hyperledger Besu Test", () => {
  it("getBalance", async () => {
    expect.hasAssertions();
    const params = [wallet.address, "latest"];
    const result = await callAPI("eth_getBalance", params, ANONYMOUS);
    expect(result).toStrictEqual(respBesu("0x0"));
  });

  it("getBlockByNumber", async () => {
    expect.hasAssertions();
    const params = ["11", true];
    const result = await callAPI("eth_getBlockByNumber", params, ANONYMOUS);
    expect(result).toStrictEqual(
      respBesu(
        expect.objectContaining({
          number: expect.any(String),
          hash: expect.any(String),
          transactions: expect.arrayContaining([]),
        })
      )
    );
  });

  it("get net_version", async () => {
    expect.hasAssertions();
    const result = await callAPI("net_version", [], ANONYMOUS);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
  });

  it("incorrect method is rejected", async () => {
    expect.hasAssertions();
    const t = async () => {
      await callAPI("incorrect_method", [], ANONYMOUS);
    };
    expect(t).toThrow(BadRequestError);
  });

  it("sendRawTransaction without authentication not allowed", async () => {
    expect.hasAssertions();
    const t = async () => {
      await callAPI("eth_sendRawTransaction", ["0x000"], ANONYMOUS);
    };
    expect(t).toThrow(UnauthorizedError);
  });

  it("session with Ledger API", async () => {
    expect.hasAssertions();
    const payload = {
      iss: "test-app",
      aud: config.API_NAME,
    };
    const privKey = utils.getJWKfromHex(wallet.privateKey);
    const opts = { expiresIn: "15 minutes" };
    const selfToken = jose.JWT.sign(payload, privKey, opts);

    const result = auth.newSession(selfToken);
    expect(result).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(String),
      })
    );
  });

  it("notarize a hash (sendRawTransaction + auth)", async () => {
    expect.hasAssertions();
    const sgnTx = await getNotarizeTransaction(randomHash);
    const result = await callAPI("eth_sendRawTransaction", [sgnTx]);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
    txId = result.result;
  });

  it("check good receipt after 2 seconds", async () => {
    expect.hasAssertions();
    await utils.sleep(2000);
    const result = await callAPI("eth_getTransactionReceipt", [txId]);
    expect(result).toStrictEqual(
      respBesu(
        expect.objectContaining({
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          from: expect.any(String),
        })
      )
    );
    const from = result.result.from.toLowerCase();
    expect(from).toBe(wallet.address.toLowerCase());
  });

  it("reject the deployment of a new smart contract", async () => {
    expect.hasAssertions();
    const sgnTx = await getDeployTransaction();
    const t = async () => {
      await callAPI("eth_sendRawTransaction", [sgnTx]);
    };
    expect(t).toThrow(ForbiddenError);
  });
});
