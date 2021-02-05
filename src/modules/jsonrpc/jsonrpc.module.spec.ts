import axios from "axios";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  DetachRecordVersionHashParam,
  InsertRecordOwnerParam,
  InsertHashAlgorithmParam,
  InsertRecordVersionInfoParam,
  TimestampHashesParam,
  TimestampRecordHashesParam,
  TimestampRecordVersionHashesParam,
  UnsignedTransaction,
  UpdateHashAlgorithmParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Timestamp, Timestamp__factory } from "../../contracts/timestamp";
import { Tar } from "../../contracts/trusted-apps-registry/Tar";
import { Tar__factory } from "../../contracts/trusted-apps-registry/factories/Tar__factory";
import { setupTestEnv } from "../../../tests/utils/timestamp";
import { setupTestEnvTar } from "../../../tests/utils/tar";
import { AsyncReturnType } from "../../shared/types/async-return-type";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertHashAlgorithmParam
  | UpdateHashAlgorithmParam
  | TimestampHashesParam
  | DetachRecordVersionHashParam
  | InsertRecordOwnerParam
  | TimestampRecordHashesParam
  | InsertRecordVersionInfoParam
  | TimestampRecordVersionHashesParam
  | TimestampRecordHashesParam;

jest.setTimeout(90000);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let timestampContract: Timestamp;
  let tarContract: Tar;
  let jsonRpcService: JsonRpcService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let testEnvTar: AsyncReturnType<typeof setupTestEnvTar>;
  const firstHashValue = `0x1234567890123456789012345678901234567890123456789012345678901234`;
  let recordId: string;
  let blockNumber = 0;
  let provider: ethers.providers.Web3Provider;
  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
    testEnvTar = await setupTestEnvTar({ administratorsTotal: 1 });
    timestampContract = testEnv.timestampContract;
    tarContract = testEnvTar.tarContract;
    provider = testEnv.provider;

    // Mock Timestamp and TAR contract
    jest
      .spyOn(Timestamp__factory, "connect")
      .mockImplementation(() => timestampContract);
    jest.spyOn(Tar__factory, "connect").mockImplementation(() => tarContract);

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);

    // Make sure we never use axios.post in tests ;-)
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    // Mock JsonRpcService (prevent calling EBSI Ledger API)
    jest.spyOn(jsonRpcService, "createSession").mockImplementation(async () => {
      return Promise.resolve();
    });

    // Instead of calling EBSI Ledger API, use timestampContract directly
    const signer = ethers.Wallet.createRandom().connect(provider);
    jest
      .spyOn(jsonRpcService, "callBesuAuth")
      .mockImplementation(async (_method: string, params: unknown[]) => {
        if (_method === "eth_sendRawTransaction") {
          const tx = await timestampContract
            .connect(signer)
            .provider.sendTransaction(params[0] as string);

          return tx.hash;
        }

        if (_method === "eth_estimateGas") {
          return timestampContract.provider.estimateGas(
            params[0] as ethers.providers.TransactionRequest
          );
        }

        return Promise.reject(new Error("Unknown method"));
      });
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server).post("/jsonrpc").send();

    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail:
        '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when sendTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: timestampContract.address,
      data: timestampContract.interface.encodeFunctionData(
        "getHashAlgorithms",
        [1, 10]
      ),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "signedTransaction",
        params: [
          {
            protocol: "eth",
            unsignedTransaction: transaction,
            r,
            s,
            v: `0x${Number(v).toString(16)}`,
            signedRawTransaction: sgnTx,
          },
        ],
        id: "45",
      });

    const { chainId } = await timestampContract.provider.getNetwork();
    const actualChainId = ethers.BigNumber.from(chainId).toHexString();

    expect(responseSend.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: `Invalid unsignedTransaction.chainId. Expected ${actualChainId}. Received 0x1b3b`,
      },
    });
    expect(responseSend.status).toBe(400);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it("should throw an error when the sender of a transaction is not in the TAR", async () => {
    expect.assertions(3);
    const wallet = ethers.Wallet.createRandom();

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertHashAlgorithm",
        params: [
          {
            from: wallet.address, // this address is not in the TAR/TIR/TUR/TUR
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as InsertHashAlgorithmParam,
        ],
        id: 231,
      });

    expect(responseBuild.status).toBe(200);

    const transaction = responseBuild.body.result as UnsignedTransaction;

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction))
    );

    uTx.chainId = Number(uTx.chainId);

    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "signedTransaction",
        params: [
          {
            protocol: "eth",
            unsignedTransaction: transaction,
            r,
            s,
            v: `0x${Number(v).toString(16)}`,
            signedRawTransaction: sgnTx,
          },
        ],
        id: "45",
      });

    expect(responseSend.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: expect.stringContaining(
          `Administrator did:ebsi:${wallet.address.toLowerCase()} was not found in the Trusted Apps Registry`
        ) as string,
      },
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an Invalid Request error for bad method", async () => {
    expect.assertions(2);

    const response = await request(server).post("/jsonrpc").send({
      jsonrpc: "2.0",
      method: "unknown-method",
      params: [],
      id: 123,
    });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 123,
      error: {
        code: -32600,
        message: expect.stringContaining(
          "The method 'unknown-method' is invalid"
        ) as string,
      },
    });
    expect(response.status).toBe(400);
  });

  // Tests to be repeated for every method
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "insertHashAlgorithm",
    "updateHashAlgorithm",
    "timestampHashes",
    "timestampRecordHashes",
    "insertRecordOwner",
    "insertRecordVersionInfo",
    "detachRecordVersionHash",
    "timestampRecordVersionHashes",
  ])("/jsonrpc with method %s", (method: string) => {
    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      let param: JsonRpcParams = null;

      const signer = testEnvTar.administrators[0];

      switch (method) {
        case "insertHashAlgorithm": {
          param = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: signer.address,
            hashAlgorithmId: 0, // "0" is the ID of the hash we've just inserted
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as UpdateHashAlgorithmParam;
          break;
        }
        case "timestampHashes": {
          param = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
          } as TimestampHashesParam;
          break;
        }
        case "timestampRecordHashes": {
          param = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as TimestampRecordHashesParam;
          break;
        }
        case "detachRecordVersionHash": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [signer.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: signer.address,
            recordId,
            versionId: 0,
            hashValue: firstHashValue,
          } as DetachRecordVersionHashParam;
          break;
        }
        case "insertRecordOwner": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [signer.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: signer.address,
            recordId,
            ownerId: "owner",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [signer.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: signer.address,
            recordId,
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [signer.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: signer.address,
            recordId,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as TimestampRecordVersionHashesParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String) as string,
          data: expect.any(String) as string,
          from: param.from,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: "0x0",
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: "45",
        });
      // blocknumber needed to compute the recordid
      if (method === "timestampRecordHashes") {
        blockNumber = await provider.getBlockNumber();
      }
      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        result: expect.any(String) as string,
      });
      expect(responseSend.status).toBe(200);
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);
      const signer = testEnvTar.administrators[0];

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertHashAlgorithm": {
          param = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as UpdateHashAlgorithmParam;
          break;
        }
        case "timestampHashes": {
          param = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
          } as TimestampHashesParam;
          break;
        }
        case "timestampRecordHashes": {
          param = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as TimestampRecordHashesParam;
          break;
        }
        case "detachRecordVersionHash": {
          param = {
            from: signer.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            versionId: 0,
            hashValue: "0x1234567890",
          } as DetachRecordVersionHashParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          param = {
            from: signer.address,
            hashAlgorithmIds: [0],
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "insertRecordOwner": {
          param = {
            from: signer.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            ownerId: "owner",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          param = {
            from: signer.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          // no id defined
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        result: expect.objectContaining({}) as unknown,
      });
      expect(responseBuild.status).toBe(200);
    });

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      expect.assertions(6);

      const signer = testEnvTar.administrators[0];

      let param1: JsonRpcParams = null;
      let param2: JsonRpcParams = null;
      let param3: JsonRpcParams = null;

      let expectedErrorMessage1;
      let expectedErrorMessage2;
      let expectedErrorMessage3;

      switch (method) {
        case "insertHashAlgorithm": {
          param1 = {
            from: signer.address,
            outputLength: -12,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as InsertHashAlgorithmParam;

          expectedErrorMessage1 =
            "property params[0].outputLength has failed the following constraints: min";

          param2 = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 3,
          } as InsertHashAlgorithmParam;

          expectedErrorMessage2 =
            "property params[0].status has failed the following constraints: max";

          param3 = ({
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: 1,
            status: 1,
          } as unknown) as InsertHashAlgorithmParam;

          expectedErrorMessage3 =
            "property params[0].oid has failed the following constraints: isString";
          break;
        }
        case "updateHashAlgorithm": {
          param1 = {
            from: signer.address,
            hashAlgorithmId: -1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as UpdateHashAlgorithmParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmId has failed the following constraints: min";

          param2 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: -1,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as UpdateHashAlgorithmParam;

          expectedErrorMessage2 =
            "property params[0].outputLength has failed the following constraints: min";

          param3 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 0,
          } as UpdateHashAlgorithmParam;

          expectedErrorMessage3 =
            "property params[0].status has failed the following constraints: min";
          break;
        }
        case "timestampHashes": {
          param1 = ({
            from: signer.address,
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
          } as unknown) as TimestampHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: isInt";

          param2 = ({
            from: signer.address,
            hashAlgorithmIds: [0],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
          } as unknown) as TimestampHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = ({
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
          } as unknown) as TimestampHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "timestampRecordHashes": {
          param1 = ({
            from: signer.address,
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as unknown) as TimestampRecordHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: isInt";

          param2 = ({
            from: signer.address,
            hashAlgorithmIds: [0],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as unknown) as TimestampRecordHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = ({
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            versionInfo: "0x1234567890",
          } as unknown) as TimestampRecordHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "detachRecordVersionHash": {
          param1 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId:
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            hashValue: "0x1234567890",
          } as unknown) as DetachRecordVersionHashParam;

          expectedErrorMessage1 =
            "property params[0].versionId has failed the following constraints: min, isInt";

          param2 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: 0,
          } as unknown) as DetachRecordVersionHashParam;

          expectedErrorMessage2 =
            "property params[0].hashValue has failed the following constraints: isHexadecimal";

          param3 = ({
            from: signer.address,
            versionId: 12,
            hashValue: "0x1234567890",
          } as unknown) as DetachRecordVersionHashParam;

          expectedErrorMessage3 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";
          break;
        }
        case "timestampRecordVersionHashes": {
          param1 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as unknown) as TimestampRecordHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: isInt";

          param2 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashAlgorithmIds: [0],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as unknown) as TimestampRecordHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            versionInfo: "0x1234567890",
          } as unknown) as TimestampRecordHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "insertRecordOwner": {
          param1 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ownerId: 0,
            notBefore: 1,
            notAfter: 12,
          } as unknown) as InsertRecordOwnerParam;

          expectedErrorMessage1 =
            "property params[0].ownerId has failed the following constraints: isString";

          param2 = ({
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ownerId: "owner",
            notBefore: "1",
            notAfter: 12,
          } as unknown) as InsertRecordOwnerParam;

          expectedErrorMessage2 =
            "property params[0].notBefore has failed the following constraints: min, isInt";

          param3 = ({
            from: signer.address,
            ownerId: "owner",
            notBefore: 1,
            notAfter: 12,
          } as unknown) as InsertRecordOwnerParam;

          expectedErrorMessage3 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";
          break;
        }
        case "insertRecordVersionInfo": {
          param1 = {
            from: signer.address,
            recordId:
              "0x123456789012345678901234567890123456789012345678901234567890123X",
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;

          expectedErrorMessage1 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: -1,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;

          expectedErrorMessage2 =
            "property params[0].versionId has failed the following constraints: min";

          param3 = {
            from: signer.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}f`,
          } as InsertRecordVersionInfoParam;

          expectedErrorMessage3 =
            "property params[0].versionInfo has failed the following constraints: isHexadecimalJSON";
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const response1 = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param1],
          id: 231,
        });

      expect(response1.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        error: {
          code: -32600,
          message: expect.stringContaining(expectedErrorMessage1) as string,
        },
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param2],
          id: 231,
        });

      expect(response2.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        error: {
          code: -32600,
          message: expect.stringContaining(expectedErrorMessage2) as string,
        },
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param3],
          id: 231,
        });

      expect(response3.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        error: {
          code: -32600,
          message: expect.stringContaining(expectedErrorMessage3) as string,
        },
      });
      expect(response3.status).toBe(400);
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      const signer = testEnvTar.administrators[0];

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      switch (method) {
        case "insertHashAlgorithm": {
          param1 = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as InsertHashAlgorithmParam;

          param2 = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
          } as InsertHashAlgorithmParam;

          break;
        }
        case "updateHashAlgorithm": {
          param1 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
          } as UpdateHashAlgorithmParam;

          param2 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
          } as UpdateHashAlgorithmParam;

          break;
        }
        case "timestampHashes": {
          param1 = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
          } as TimestampHashesParam;

          param2 = {
            from: signer.address,
            hashAlgorithmIds: [1],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
          } as TimestampHashesParam;

          break;
        }
        case "timestampRecordHashes": {
          param1 = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x125345568a",
          } as TimestampRecordHashesParam;

          param2 = {
            from: signer.address,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x0a45567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as TimestampRecordHashesParam;

          break;
        }
        case "timestampRecordVersionHashes": {
          param1 = {
            from: signer.address,
            recordId: firstHashValue,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x125345568a",
          } as TimestampRecordVersionHashesParam;

          param2 = {
            from: signer.address,
            recordId: firstHashValue,
            hashAlgorithmIds: [0],
            hashValues: [
              "0x0a45567890123456789012345678901234567890123456789012345678901234",
            ],
            timestampData: [
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            ],
            versionInfo: "0x1234567890",
          } as TimestampRecordVersionHashesParam;

          break;
        }
        case "detachRecordVersionHash": {
          param1 = {
            from: signer.address,
            recordId: firstHashValue,
            versionId: 0,
            hashValue: "0x125345568a",
          } as DetachRecordVersionHashParam;

          param2 = {
            from: signer.address,
            recordId: firstHashValue,
            versionId: 0,
            hashValue: "0x1234567890",
          } as DetachRecordVersionHashParam;

          break;
        }
        case "insertRecordOwner": {
          param1 = {
            from: signer.address,
            recordId: firstHashValue,
            ownerId: "owner",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;

          param2 = {
            from: signer.address,
            recordId: firstHashValue,
            ownerId: "ownerchanged",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;

          break;
        }
        case "insertRecordVersionInfo": {
          const versionInfo = `0x${Buffer.from(
            JSON.stringify({ test: 42 }),
            "utf8"
          ).toString("hex")}`;

          param1 = {
            from: signer.address,
            recordId: firstHashValue,
            versionId: 0,
            versionInfo,
          } as InsertRecordVersionInfoParam;

          param2 = {
            from: signer.address,
            recordId: firstHashValue,
            versionId: 1,
            versionInfo,
          } as InsertRecordVersionInfoParam;

          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param1],
          id: 231,
        });
      expect(responseBuild1.status).toBe(200);
      const transaction1 = responseBuild1.body.result as UnsignedTransaction;

      const responseBuild2: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [param2],
          id: 232,
        });
      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const randomSigner = ethers.Wallet.createRandom();

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(transaction1))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction2,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx1,
            },
          ],
          id: "45",
        });
      expect(responseSend1.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        error: {
          code: -32600,
          message: expect.stringContaining(
            "does not match with the signedRawTransaction"
          ) as string,
        },
      });
      expect(responseSend1.status).toBe(400);

      // Tampering "from"
      transaction1.from = transaction2.from;
      const responseSend2 = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction1,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx1,
            },
          ],
          id: "46",
        });
      expect(responseSend2.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "46",
        error: {
          code: -32600,
          message: expect.stringContaining(
            "does not match with unsignedTransaction.from"
          ) as string,
        },
      });
      expect(responseSend1.status).toBe(400);
    });
  });
});
