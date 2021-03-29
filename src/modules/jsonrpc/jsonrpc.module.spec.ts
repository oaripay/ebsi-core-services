import axios from "axios";
import request from "supertest";
import crypto from "crypto";
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
import { canonize } from "jsonld";
import * as bs58 from "bs58";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  UnsignedTransaction,
  InsertAdministratorParam,
  UpdateAdministratorParam,
  InsertHashAlgorithmParam,
  UpdateHashAlgorithmParam,
  InsertPolicyParam,
  UpdatePolicyParam,
  InsertDidControllerParam,
  InsertDidDocumentParam,
  UpdateDidDocumentParam,
  UpdateDidControllerParam,
  RevokeDidControllerParam,
  InsertDidMethodParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  DidRegistry,
  DidRegistry__factory,
} from "../../contracts/did-registry";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertAdministratorParam
  | UpdateAdministratorParam
  | InsertHashAlgorithmParam
  | UpdateHashAlgorithmParam
  | InsertPolicyParam
  | UpdatePolicyParam
  | InsertDidDocumentParam
  | UpdateDidDocumentParam
  | InsertDidControllerParam
  | UpdateDidControllerParam
  | RevokeDidControllerParam
  | InsertDidMethodParam;

interface DidDocumentDataset {
  didDocument: { [x: string]: unknown };
  didDocumentBuffer: Buffer;
  canonizedDidDocument: string;
  canonizedDidDocumentBuffer: Buffer;
  canonizedDidDocumentHash: string;
  timestampDataBuffer: Buffer;
  didVersionMetadataBuffer: Buffer;
}

interface DidMethodDataset {
  didMethods: { [x: string]: unknown }[];
  didMethodsBuffer: Buffer[];
  canonizedDidMethods: string[];
  canonizedDidMethodsBuffer: Buffer[];
  canonizedDidMethodsHash: string[];
}

jest.setTimeout(120000);

const ADMINS_TOTAL = 1;

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let didRegistryContract: DidRegistry;
  let jsonRpcService: JsonRpcService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let provider: ethers.providers.Web3Provider;

  const createAdministrator = (wallet: ethers.Wallet) => {
    const did = `did:ebsi:${wallet.address.toLowerCase()}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const attributeData = `0x${Buffer.from(JSON.stringify(json)).toString(
      "hex"
    )}`;

    return { did, attributeData };
  };

  function createPolicy() {
    const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const policyData = `0x${data.toString("hex")}`;
    return {
      policyId,
      policyData,
    };
  }

  const newAdminWallet = ethers.Wallet.createRandom();
  const adminV1 = createAdministrator(newAdminWallet);
  const adminV2 = createAdministrator(newAdminWallet);
  const adminV3 = createAdministrator(newAdminWallet);

  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const policy3 = createPolicy();

  const createDid = (): string => {
    const buf = crypto.randomBytes(32);
    return `did:ebsi:${bs58.encode(buf)}`;
  };

  const controllerDid = createDid();

  const createDidDocument = async (
    did: string
  ): Promise<DidDocumentDataset> => {
    const didDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://identity.foundation/EcdsaSecp256k1RecoverySignature2020/lds-ecdsa-secp256k1-recovery2020-0.0.jsonld",
      ],
      id: did,
      publicKey: [
        {
          id: `${did}#vm-3`,
          controller: did,
          type: "EcdsaSecp256k1RecoveryMethod2020",
          blockchainAccountId:
            "0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb@eip155:1",
        },
      ],
    };

    const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

    // Canonize DID Document
    const canonizedDidDocument = await canonize(didDocument, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
    });

    const canonizedDidDocumentBuffer = Buffer.from(canonizedDidDocument);
    const canonizedDidDocumentHash = ethers.utils.sha256(
      canonizedDidDocumentBuffer
    );

    const timestampDataBuffer = Buffer.from(JSON.stringify({ data: "test" }));
    const didVersionMetadataBuffer = Buffer.from(
      JSON.stringify({ metadata: "value" })
    );

    return {
      didDocument,
      didDocumentBuffer,
      canonizedDidDocument,
      canonizedDidDocumentBuffer,
      canonizedDidDocumentHash,
      timestampDataBuffer,
      didVersionMetadataBuffer,
    };
  };

  const createDidMethod = async (): Promise<DidMethodDataset> => {
    const didMethod = {
      "@context": "https://json-ld.org/contexts/person.jsonld",
      "@id": "http://dbpedia.org/resource/John_Lennon",
      name: "John Lennon",
      born: "1940-10-09",
      spouse: "http://dbpedia.org/resource/Cynthia_Lennon",
    };

    const didMethodBuffer = Buffer.from(JSON.stringify(didMethod));

    // Canonize DID Method
    const canonizedDidMethod = await canonize(didMethod, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
    });

    const canonizedDidMethodBuffer = Buffer.from(canonizedDidMethod);
    const canonizedDidMethodHash = ethers.utils.sha256(
      canonizedDidMethodBuffer
    );

    return {
      didMethods: [didMethod],
      didMethodsBuffer: [didMethodBuffer],
      canonizedDidMethods: [canonizedDidMethod],
      canonizedDidMethodsBuffer: [canonizedDidMethodBuffer],
      canonizedDidMethodsHash: [canonizedDidMethodHash],
    };
  };

  let didDocument: DidDocumentDataset;
  let updatedDidDocument: DidDocumentDataset;
  const controllers: ethers.Wallet[] = [];

  let didMethod: DidMethodDataset;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: ADMINS_TOTAL,
    });
    didRegistryContract = testEnv.didRegistryContract;

    provider = testEnv.provider;

    // Mock DidRegistry and TAR contract
    jest
      .spyOn(DidRegistry__factory, "connect")
      .mockImplementation(() => didRegistryContract);

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

    // Instead of calling EBSI Ledger API, use didRegistryContract directly
    const signer = ethers.Wallet.createRandom().connect(provider);
    jest
      .spyOn(jsonRpcService, "callBesuAuth")
      .mockImplementation(async (_method: string, params: unknown[]) => {
        if (_method === "eth_sendRawTransaction") {
          const tx = await didRegistryContract
            .connect(signer)
            .provider.sendTransaction(params[0] as string);

          return tx.hash;
        }

        if (_method === "eth_estimateGas") {
          return didRegistryContract.provider.estimateGas(
            params[0] as ethers.providers.TransactionRequest
          );
        }

        return Promise.reject(new Error("Unknown method"));
      });

    didDocument = await createDidDocument(controllerDid);
    updatedDidDocument = await createDidDocument(controllerDid);
    didMethod = await createDidMethod();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
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
    const { did } = adminV1;

    const transaction = {
      from: wallet.address,
      to: didRegistryContract.address,
      data: didRegistryContract.interface.encodeFunctionData(
        "insertAdministrator",
        [did.toLowerCase(), adminV1.attributeData]
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

    const { chainId } = await didRegistryContract.provider.getNetwork();
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

  it("should return throw an error if the signer is not a registered admin", async () => {
    expect.assertions(4);

    const { did } = adminV1;

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      attributeData: adminV1.attributeData,
      did: did.toLowerCase(),
      from: signer.address,
    } as InsertAdministratorParam;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertAdministrator",
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

    expect(responseSend.body).toStrictEqual({
      error: {
        code: -32600,
        message: `Administrator did:ebsi:${signer.address.toLowerCase()} was not found in the DID Registry`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "insertAdministrator",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
    "insertHashAlgorithm",
    "updateHashAlgorithm",
    "insertPolicy",
    "updatePolicy",
    "insertDidDocument",
    "updateDidDocument",
    "insertDidController",
    "updateDidController",
    "revokeDidController",
    "insertDidMethod",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      const { did } = adminV1;
      let param: JsonRpcParams = null;
      const defaultSigner = testEnv.administrators[0].wallet;
      let signer = defaultSigner;

      switch (method) {
        case "insertAdministrator": {
          // create a new administrator and add attribute1
          param = {
            attributeData: adminV1.attributeData,
            did: did.toLowerCase(),
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "updateAdministrator": {
          if (updateAttribute) {
            // update attribute1: change it to attribute3
            param = {
              attributeData: adminV3.attributeData,
              did: did.toLowerCase(),
              from: signer.address,
              prevAttributeHash: ethers.utils.sha256(
                Buffer.from(adminV1.attributeData.slice(2), "hex")
              ),
            } as UpdateAdministratorParam;
          } else {
            // updateIssuer: add attribute2
            param = {
              attributeData: adminV2.attributeData,
              did: did.toLowerCase(),
              from: signer.address,
            } as UpdateAdministratorParam;
          }
          break;
        }
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
        case "insertPolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policyData: policy1.policyData,
          } as InsertPolicyParam;
          break;
        }
        case "updatePolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policyData: policy2.policyData,
          } as UpdatePolicyParam;
          break;
        }
        case "insertDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          controllers.push(signer);

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;

          break;
        }
        case "insertDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const controller = ethers.Wallet.createRandom();
          controllers.push(controller);

          param = {
            from: signer.address,
            identifier,
            newControllerId: controller.address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          break;
        }
        case "updateDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const controller = controllers[controllers.length - 1];
          // Sign with the new controller
          signer = controller;

          param = {
            from: signer.address,
            identifier,
            newControllerId: controller.address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as UpdateDidControllerParam;

          break;
        }
        case "revokeDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            oldControllerId: controllers[controllers.length - 1].address,
          } as RevokeDidControllerParam;

          break;
        }
        case "insertDidMethod": {
          param = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as InsertDidMethodParam;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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

      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        result: expect.any(String) as string,
      });
      expect(responseSend.status).toBe(200);
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);

      const signer = testEnv.administrators[0].wallet;
      let param: JsonRpcParams = null;

      switch (method) {
        case "insertAdministrator": {
          param = {
            attributeData: adminV1.attributeData,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "updateAdministrator": {
          param = {
            attributeData: adminV1.attributeData,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
          } as UpdateAdministratorParam;
          break;
        }
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
        case "insertPolicy":
        case "updatePolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policyData: policy1.policyData,
          } as InsertPolicyParam;
          break;
        }
        case "insertDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const controllerId = ethers.Wallet.createRandom().address;

          param = {
            from: signer.address,
            identifier,
            newControllerId: controllerId,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;
          break;
        }
        case "revokeDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const controllerId = ethers.Wallet.createRandom().address;

          param = {
            from: signer.address,
            identifier,
            oldControllerId: controllerId,
          } as RevokeDidControllerParam;

          break;
        }
        case "insertDidMethod": {
          param = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as InsertDidMethodParam;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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

      const signer = testEnv.administrators[0].wallet;

      let param1: JsonRpcParams = null;
      let param2: JsonRpcParams = null;
      let param3: JsonRpcParams = null;

      let expectedErrorMessage1;
      let expectedErrorMessage2;
      let expectedErrorMessage3;

      switch (method) {
        case "insertAdministrator": {
          param1 = {
            did: adminV1.did,
            from: signer.address,
          } as InsertAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].attributeData has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            attributeData: adminV1.attributeData,
          } as InsertAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].did has failed the following constraints: isLowercase, isDid";

          param3 = {
            did: adminV1.did,
            attributeData: adminV1.attributeData,
            from: "bad address",
          } as InsertAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
        case "updateAdministrator": {
          param1 = {
            did: adminV1.did,
            from: signer.address,
          } as UpdateAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].attributeData has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            attributeData: adminV1.attributeData,
          } as UpdateAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].did has failed the following constraints: isLowercase, isDid";

          param3 = {
            did: adminV1.did,
            attributeData: adminV1.attributeData,
            from: "bad address",
          } as UpdateAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
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
        case "insertPolicy":
        case "updatePolicy": {
          param1 = {
            ...policy1,
            from: signer.address,
          } as InsertPolicyParam;
          param2 = {
            ...policy2,
            from: signer.address,
          } as InsertPolicyParam;
          param3 = {
            ...policy3,
            from: signer.address,
          } as InsertPolicyParam;

          delete param1.policyId;
          expectedErrorMessage1 =
            "property params[0].policyId has failed the following constraints: isString";

          delete param2.policyData;
          expectedErrorMessage2 =
            "property params[0].policyData has failed the following constraints: isHexadecimal";

          param3.from = "bad address";
          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
        case "insertDidDocument":
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: "0xnot-a-hash",
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          expectedErrorMessage1 =
            "property params[0].hashValue has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo: Buffer.from(
              JSON.stringify({ test: "value" })
            ).toString("hex"),
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          expectedErrorMessage2 =
            "property params[0].didVersionInfo has failed the following constraints: IsHexadecimalJsonLdConstraint";

          param3 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData: "1234ab",
            didVersionMetadata,
          } as InsertDidDocumentParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimalJson";

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          param1 = {
            from: signer.address,
            identifier: `0x${Buffer.from("did:ebsi:not-base-58").toString(
              "hex"
            )}`,
            newControllerId: ethers.Wallet.createRandom().address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          expectedErrorMessage1 =
            "property params[0].identifier has failed the following constraints: isHexadecimalBase58EbsiDid";

          param2 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            newControllerId: "0x1234",
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          expectedErrorMessage2 =
            "property params[0].newControllerId has failed the following constraints: isEthereumAddress";

          param3 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            newControllerId: ethers.Wallet.createRandom().address,
            notBefore: -123,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          expectedErrorMessage3 =
            "property params[0].notBefore has failed the following constraints: min";
          break;
        }
        case "revokeDidController": {
          param1 = {
            from: signer.address,
            identifier: `0x${Buffer.from("did:ebsi:not-base-58").toString(
              "hex"
            )}`,
            oldControllerId: ethers.Wallet.createRandom().address,
          } as RevokeDidControllerParam;

          expectedErrorMessage1 =
            "property params[0].identifier has failed the following constraints: isHexadecimalBase58EbsiDid";

          param2 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            oldControllerId: "0x1234",
          } as RevokeDidControllerParam;

          expectedErrorMessage2 =
            "property params[0].oldControllerId has failed the following constraints: isEthereumAddress";

          param3 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
          } as RevokeDidControllerParam;

          expectedErrorMessage3 =
            "property params[0].oldControllerId has failed the following constraints: isEthereumAddress";
          break;
        }
        case "insertDidMethod": {
          param1 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: ["0x"],
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as InsertDidMethodParam;

          expectedErrorMessage1 =
            "property params[0].methodSpec has failed the following constraints: IsHexadecimalJsonLdConstraint";

          param2 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 4,
          } as InsertDidMethodParam;

          expectedErrorMessage2 =
            "property params[0].status has failed the following constraints: max";

          param3 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: -1,
            status: 2,
          } as InsertDidMethodParam;

          expectedErrorMessage3 =
            "property params[0].notAfter has failed the following constraints: min";

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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

      const signer = testEnv.administrators[0].wallet;

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      switch (method) {
        case "insertAdministrator": {
          param1 = {
            ...adminV1,
            from: signer.address,
          } as InsertAdministratorParam;
          param2 = {
            ...adminV2,
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "updateAdministrator": {
          param1 = {
            ...adminV1,
            from: signer.address,
          } as UpdateAdministratorParam;
          param2 = {
            ...adminV2,
            from: signer.address,
          } as UpdateAdministratorParam;
          break;
        }
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
        case "insertPolicy":
        case "updatePolicy": {
          param1 = {
            ...policy1,
            from: signer.address,
          } as InsertPolicyParam;
          param2 = {
            ...policy2,
            from: signer.address,
          } as InsertPolicyParam;
          break;
        }
        case "insertDidDocument":
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 1,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          param1 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            newControllerId: ethers.Wallet.createRandom().address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          param2 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            newControllerId: ethers.Wallet.createRandom().address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          break;
        }
        case "revokeDidController": {
          param1 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            oldControllerId: ethers.Wallet.createRandom().address,
          } as RevokeDidControllerParam;

          param2 = {
            from: signer.address,
            identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            oldControllerId: ethers.Wallet.createRandom().address,
          } as RevokeDidControllerParam;

          break;
        }
        case "insertDidMethod": {
          param1 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as InsertDidMethodParam;

          param2 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 2,
          } as InsertDidMethodParam;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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
