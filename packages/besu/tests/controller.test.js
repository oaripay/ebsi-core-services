const ethers = require("ethers");
const axios = require("axios");
require("dotenv").config();

const config = require("../src/config");
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} = require("../src/errors");
const utils = require("../src/utils");
const controller = require("../src/controller");

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
    expect.assertions(1);
    const params = [wallet.address, "latest"];
    const result = await callAPI("eth_getBalance", params, ANONYMOUS);
    expect(result).toStrictEqual(respBesu("0x0"));
  });

  it("getBlockByNumber", async () => {
    expect.assertions(1);
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
    expect.assertions(1);
    const result = await callAPI("net_version", [], ANONYMOUS);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
  });

  it("incorrect method is rejected", async () => {
    expect.assertions(1);
    const check = async () => {
      await callAPI("incorrect_method", [], ANONYMOUS);
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });

  it("sendRawTransaction without authentication not allowed", async () => {
    expect.assertions(1);
    const check = async () => {
      await callAPI("eth_sendRawTransaction", ["0x000"], ANONYMOUS);
    };
    await expect(check()).rejects.toThrow(UnauthorizedError);
  });

  it("notarize a hash (sendRawTransaction + auth)", async () => {
    expect.assertions(1);
    const sgnTx = await getNotarizeTransaction(randomHash);
    const result = await callAPI("eth_sendRawTransaction", [sgnTx]);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
    txId = result.result;
  });

  it("check good receipt after 2 seconds", async () => {
    expect.assertions(2);
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
    expect.assertions(1);
    const sgnTx = await getDeployTransaction();
    const check = async () => {
      await callAPI("eth_sendRawTransaction", [sgnTx]);
    };
    await expect(check()).rejects.toThrow(ForbiddenError);
  });

  it("reject call without query", async () => {
    expect.assertions(1);
    const check = async () => {
      await controller.besuRPC();
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });

  it("reject disabled method", async () => {
    expect.assertions(1);
    const check = async () => {
      await callAPI("eth_sendTransaction", ["0x000"]);
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });

  it("reject bad request", async () => {
    expect.assertions(1);
    const params = [wallet.address];
    const check = async () => {
      await callAPI("eth_getBalance", params, ANONYMOUS);
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });

  it("internal error when the rpc is not working", async () => {
    expect.assertions(2);

    jest.mock("axios");
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("error with connection");
    });

    const params = [wallet.address, "latest"];
    const check = async () => {
      await callAPI("eth_getBalance", params, ANONYMOUS);
    };

    await expect(check()).rejects.toThrow(Error);

    jest.spyOn(axios, "post").mockImplementation(() => {
      const error = new Error("http error");
      error.response = {
        status: 500,
        data: "internal error",
      };
      throw error;
    });

    await expect(check()).rejects.toThrow(Error);

    axios.post.mockRestore();
  });
});
