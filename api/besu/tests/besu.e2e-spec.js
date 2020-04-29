const axios = require("axios");
const jose = require("jose");
const ethers = require("ethers");

const config = require("../config");
const utils = require("../utils");
const configTest = require("./config");

const { api, TEST_APP_NAME, privKey } = configTest;
const apiBesu = `${api}/blockchains/besu`;

const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
const wallet = ethers.Wallet.createRandom();
const r = Math.random().toString(36);
const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));

let txId;

// axios: don't throw error for status >= 400
axios.defaults.validateStatus = () => {
  return true;
};
let axiosAuth;

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

function packBody(method, params) {
  return {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };
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

describe("hyperledger Besu integration test", () => {
  it("getBalance", async () => {
    expect.assertions(2);
    const params = [wallet.address, "latest"];
    const response = await axios.post(
      apiBesu,
      packBody("eth_getBalance", params)
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(respBesu("0x0"));
  });

  it("getBlockByNumber", async () => {
    expect.assertions(2);
    const params = ["11", true];
    const response = await axios.post(
      apiBesu,
      packBody("eth_getBlockByNumber", params)
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(
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
    expect.assertions(2);
    const response = await axios.post(apiBesu, packBody("net_version", []));
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(respBesu(expect.any(String)));
  });

  it("incorrect method is rejected", async () => {
    expect.assertions(1);
    const response = await axios.post(
      apiBesu,
      packBody("incorrect_method", [])
    );
    expect(response.status).toBe(400);
  });

  it("sendRawTransaction without authentication not allowed", async () => {
    expect.assertions(1);
    const response = await axios.post(
      apiBesu,
      packBody("eth_sendRawTransaction", ["0x000"])
    );
    expect(response.status).toBe(401);
  });

  it("session with Ledger API", async () => {
    expect.assertions(2);
    const payload = {
      iss: TEST_APP_NAME,
      aud: config.API_NAME,
    };
    const opts = { expiresIn: "15 minutes" };
    const selfToken = jose.JWT.sign(payload, privKey, opts);

    const response = await axios.post(`${api}/sessions`, {
      grantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: selfToken,
    });
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(Number),
      })
    );
    const token = response.data.accessToken;
    axiosAuth = axios.create({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });

  it("notarize a hash (sendRawTransaction + auth)", async () => {
    expect.assertions(2);
    const sgnTx = await getNotarizeTransaction(randomHash);
    const response = await axiosAuth.post(
      apiBesu,
      packBody("eth_sendRawTransaction", [sgnTx])
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(respBesu(expect.any(String)));
    txId = response.data.result;
  });

  it("check good receipt after 2 seconds", async () => {
    expect.assertions(3);
    await utils.sleep(2000);
    const response = await axiosAuth.post(
      apiBesu,
      packBody("eth_getTransactionReceipt", [txId])
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(
      respBesu(
        expect.objectContaining({
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          from: expect.any(String),
        })
      )
    );
    const from = response.data.result.from.toLowerCase();
    expect(from).toBe(wallet.address.toLowerCase());
  });

  it("reject the deployment of a new smart contract", async () => {
    expect.assertions(1);
    const sgnTx = await getDeployTransaction();
    const response = await axiosAuth.post(
      apiBesu,
      packBody("eth_sendRawTransaction", [sgnTx])
    );
    expect(response.status).toBe(403);
  });
});
