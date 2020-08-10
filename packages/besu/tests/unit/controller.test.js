const ethers = require("ethers");
const Web3 = require("web3");
const EthereumJsTx = require("ethereumjs-tx").Transaction;
const Common = require("ethereumjs-common").default;
const axios = require("axios");
const {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  InternalServerError,
} = require("@cef-ebsi/problem-details-errors");
require("dotenv").config();

const config = require("../../src/config");
const utils = require("../../src/utils");
const controller = require("../../src/controller");

const ANONYMOUS = false;
const { notary } = config;
let chainId = 0; // The chain ID this transaction is authorized on, as specified by EIP-155.
jest.setTimeout(10000);

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

async function buildTxNotaryWithEthers(hash) {
  const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
  const wallet = ethers.Wallet.createRandom();
  const iface = new ethers.utils.Interface(notary.abi);
  const ethersChainId = ethers.BigNumber.from(chainId).toNumber();
  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: notary.address,
    value: 0,
    data: iface.encodeFunctionData("addRecord", [hash]),
    chainId: ethersChainId,
    from: wallet.address,
  };

  return wallet.signTransaction(transaction);
}

async function buildTxNotaryWithWeb3(hash) {
  const provider = new Web3.providers.HttpProvider(config.besuRPCNode);
  const web3 = new Web3(provider);
  const privKey = Web3.utils.randomHex(32);
  const from = web3.eth.accounts.privateKeyToAccount(privKey).address;
  const contract = new web3.eth.Contract(notary.abi, notary.address);

  const transaction = {
    nonce: await web3.eth.getTransactionCount(from, "pending"),
    gasLimit: web3.utils.numberToHex(221000),
    gasPrice: "0x0",
    to: notary.address,
    value: "0x0",
    data: contract.methods.addRecord(hash).encodeABI(),
    chainId,
  };
  const signed = await web3.eth.accounts.signTransaction(transaction, privKey);
  return signed.rawTransaction;
}

async function buildTxNotaryWithEthereumJsTx(hash) {
  const provider = new ethers.providers.JsonRpcProvider(config.besuRPCNode);
  const wallet = ethers.Wallet.createRandom();
  const iface = new ethers.utils.Interface(notary.abi);

  const transaction = {
    nonce: await provider.getTransactionCount(wallet.address),
    gasLimit: 221000,
    gasPrice: 0,
    to: notary.address,
    value: 0,
    data: iface.encodeFunctionData("addRecord", [hash]),
  };

  const optsChain = {
    common: Common.forCustomChain(
      "mainnet",
      {
        name: "ebsi-network",
        networkId: chainId,
        chainId,
      },
      "petersburg"
    ),
  };
  const tx = new EthereumJsTx(transaction, optsChain);
  const privateKey = Buffer.from(wallet.privateKey.slice(2), "hex");
  tx.sign(privateKey);
  return tx.serialize().toString("hex");
}

async function buildTxNotary(library = "ethers") {
  const r = Math.random().toString(36);
  const hash = ethers.utils.keccak256(Buffer.from(r, "utf8"));

  if (library === "ethers") {
    return buildTxNotaryWithEthers(hash);
  }
  if (library === "web3") {
    return buildTxNotaryWithWeb3(hash);
  }
  if (library === "ethereumjs-tx") {
    return buildTxNotaryWithEthereumJsTx(hash);
  }
  return null;
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
    from: wallet.address,
  };

  return wallet.signTransaction(transaction);
}

/*
 * Tests
 */

describe("hyperledger Besu Test", () => {
  it("throws internal error when the chainId can not be read", async () => {
    expect.assertions(1);

    jest.mock("axios");
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("error with connection");
    });

    const check = async () => {
      await callAPI("eth_sendRawTransaction", [""]);
    };

    await expect(check()).rejects.toThrow(
      new InternalServerError(InternalServerError.defaultTitle, {
        detail:
          "The server encountered an internal error and was unable to complete your request.",
      })
    );

    axios.post.mockRestore();
    jest.unmock("axios");
  });

  it("getChainId should resolve and match net_version", async () => {
    expect.assertions(3);
    const result = await callAPI("eth_chainId", [], ANONYMOUS);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
    chainId = result.result;
    const netVersion = await callAPI("net_version", [], ANONYMOUS);
    expect(netVersion).toStrictEqual(respBesu(expect.any(String)));
    const chainNum = ethers.BigNumber.from(chainId).toNumber();
    const networkId = Number(netVersion.result);
    expect(chainNum).toStrictEqual(networkId);
  });

  it("getBalance", async () => {
    expect.assertions(1);
    const wallet = ethers.Wallet.createRandom();
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
    await expect(check()).rejects.toThrow(
      new BadRequestError(BadRequestError.defaultTitle, {
        detail: "'incorrect_method' does not exist",
      })
    );
  });

  it("sendRawTransaction without authentication not allowed", async () => {
    expect.assertions(1);
    const check = async () => {
      await callAPI("eth_sendRawTransaction", ["0x000"], ANONYMOUS);
    };
    await expect(check()).rejects.toThrow(
      new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "not available for anonymous access",
      })
    );
  });

  it("notarize a hash using ethers library", async () => {
    expect.assertions(2);
    const sgnTx = await buildTxNotary();
    const result = await callAPI("eth_sendRawTransaction", [sgnTx]);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
    const txId = result.result;

    await utils.sleep(2000);
    const receipt = await callAPI("eth_getTransactionReceipt", [txId]);

    expect(receipt).toStrictEqual(
      respBesu(
        expect.objectContaining({
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          from: expect.any(String),
        })
      )
    );
  });

  it("notarize a hash using web3 library", async () => {
    expect.assertions(2);
    const sgnTx = await buildTxNotary("web3");
    const result = await callAPI("eth_sendRawTransaction", [sgnTx]);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
    const txId = result.result;

    await utils.sleep(2000);
    const receipt = await callAPI("eth_getTransactionReceipt", [txId]);

    expect(receipt).toStrictEqual(
      respBesu(
        expect.objectContaining({
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          from: expect.any(String),
        })
      )
    );
  });

  it("notarize a hash using ethereumjs-tx library", async () => {
    expect.assertions(2);
    const sgnTx = await buildTxNotary("ethereumjs-tx");
    const result = await callAPI("eth_sendRawTransaction", [sgnTx]);
    expect(result).toStrictEqual(respBesu(expect.any(String)));
    const txId = result.result;

    await utils.sleep(2000);
    const receipt = await callAPI("eth_getTransactionReceipt", [txId]);

    expect(receipt).toStrictEqual(
      respBesu(
        expect.objectContaining({
          blockHash: expect.any(String),
          blockNumber: expect.any(String),
          from: expect.any(String),
        })
      )
    );
  });

  it("throws an error for a different chain id", async () => {
    expect.assertions(1);

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

    const check = async () => {
      await callAPI("eth_sendRawTransaction", [signed.rawTransaction]);
    };
    await expect(check()).rejects.toThrow(
      new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Invalid chain id",
      })
    );
  });

  it("throws bad request when a transaction can not be parsed", async () => {
    expect.assertions(1);
    const check = async () => {
      await callAPI("eth_sendRawTransaction", ["0xf884808083035f48943"]);
    };
    await expect(check()).rejects.toThrow(
      new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Error parsing the transaction:",
      })
    );
  });

  it("reject the deployment of a new smart contract", async () => {
    expect.assertions(1);
    const sgnTx = await getDeployTransaction();
    const check = async () => {
      await callAPI("eth_sendRawTransaction", [sgnTx]);
    };
    await expect(check()).rejects.toThrow(
      new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: "Deployment of new smart contracts is not allowed",
      })
    );
  });

  it("reject call without query", async () => {
    expect.assertions(1);
    const check = async () => {
      await controller.besuRPC();
    };
    await expect(check()).rejects.toThrow(
      new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Not method or params defined",
      })
    );
  });

  it("reject disabled method", async () => {
    expect.assertions(1);
    const check = async () => {
      await callAPI("eth_sendTransaction", ["0x000"]);
    };
    await expect(check()).rejects.toThrow(
      new BadRequestError(BadRequestError.defaultTitle, {
        detail: "is currently disabled",
      })
    );
  });

  it("reject bad request", async () => {
    expect.assertions(1);
    const params = ["0xb0Eb80e1ab11190b20cB4204744e00a9F03789d8"];
    const check = async () => {
      await callAPI("eth_getBalance", params, ANONYMOUS);
    };
    await expect(check()).rejects.toThrow(
      new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Besu RPC Error:",
      })
    );
  });

  it("internal error when the rpc is not working", async () => {
    expect.assertions(2);

    jest.mock("axios");
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("error with connection");
    });

    const params = ["0xb0Eb80e1ab11190b20cB4204744e00a9F03789d8", "latest"];
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
