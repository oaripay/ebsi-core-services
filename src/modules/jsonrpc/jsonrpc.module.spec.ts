import request from "supertest";
import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ethers } from "ethers";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { createJWT, ES256KSigner } from "@cef-ebsi/did-jwt";
import { Session as OAuth2Session } from "@cef-ebsi/oauth2-auth";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import canonicalize from "canonicalize";
import { useContainer } from "class-validator";
import { JsonRpcModule } from "./jsonrpc.module";
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
  UpdateDidMethodParam,
  AppendDidDocumentVersionHashParam,
  DetachDidDocumentVersionParam,
  AppendDidDocumentVersionMetadataParam,
  DetachDidDocumentVersionMetadataParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  DidRegistry,
  DidRegistry__factory,
} from "../../contracts/did-registry";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import {
  createDid,
  createDidDocument,
  createMetadata,
  createDidMethod,
} from "../../../tests/utils/data";
import { ApiConfig } from "../../config/configuration";
import { LedgerService } from "../ledger/ledger.service";

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
  | InsertDidMethodParam
  | UpdateDidMethodParam
  | AppendDidDocumentVersionHashParam
  | DetachDidDocumentVersionParam
  | AppendDidDocumentVersionMetadataParam
  | DetachDidDocumentVersionMetadataParam;

interface DidDocumentDataset {
  didDocument: { [x: string]: unknown };
  didDocumentBuffer: Buffer;
  canonicalizedDidDocument: string;
  canonicalizedDidDocumentHash: string;
  timestampDataBuffer: Buffer;
  didVersionMetadataBuffer: Buffer;
}

interface DidMethodDataset {
  didMethods: { [x: string]: unknown }[];
  didMethodsBuffer: Buffer[];
  canonicalizedDidMethods: string[];
  canonicalizedDidMethodsBuffer: Buffer[];
  canonicalizedDidMethodsHash: string[];
}

jest.setTimeout(300000);

const ADMINS_TOTAL = 2;

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let didRegistryContract: DidRegistry;
  let configService: ConfigService<ApiConfig>;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let ledgerService: LedgerService;
  let appAccessToken: string;
  let adminAccessToken: string;
  let userAccessToken: string;
  let defaultSignerSiopAccessToken: string;

  const createAdministrator = (did: string, usingValidTo = true) => {
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
      validFrom: new Date().toISOString(),
      ...(usingValidTo && {
        validTo: new Date(Date.now() + 4e8).toISOString(),
      }),
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

  const adminDid = createDid();
  const adminV1 = createAdministrator(adminDid);
  const adminV2 = createAdministrator(adminDid);
  const adminV3 = createAdministrator(adminDid);

  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const policy3 = createPolicy();

  const controllerDid = createDid();
  const badControllerDid =
    "did:unregistered-method:0xb9c5714089478a327f09197987f16f9e5d936e8a";

  const multihashToNodeHashAlg = {
    "sha2-256": "sha256",
    "sha2-512": "sha512",
    "sha3-224": "sha3-224",
    "sha3-256": "sha3-256",
    "sha3-384": "sha3-384",
    "sha3-512": "sha3-512",
  };

  const computeHash = (value: string, multihash: string): string =>
    `0x${crypto
      .createHash(multihashToNodeHashAlg[multihash])
      .update(value, "utf-8")
      .digest()
      .toString("hex")}`;

  const prepareDidDocument = (
    did: string,
    multihash: string
  ): DidDocumentDataset => {
    const didDocument = createDidDocument(did);

    const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

    // Canonicalize DID Document
    const canonicalizedDidDocument = canonicalize(didDocument);

    const canonicalizedDidDocumentHash = computeHash(
      canonicalizedDidDocument,
      multihash
    );

    const timestampDataBuffer = Buffer.from(
      JSON.stringify({ data: "test", r: crypto.randomBytes(8).toString("hex") })
    );
    const didVersionMetadataBuffer = Buffer.from(
      JSON.stringify(createMetadata())
    );

    return {
      didDocument,
      didDocumentBuffer,
      canonicalizedDidDocument,
      canonicalizedDidDocumentHash,
      timestampDataBuffer,
      didVersionMetadataBuffer,
    };
  };

  const prepareDidMethod = (): DidMethodDataset => {
    const didMethod = createDidMethod();

    const didMethodBuffer = Buffer.from(JSON.stringify(didMethod));

    // Canonicalize DID Method
    const canonicalizedDidMethod = canonicalize(didMethod);

    const canonicalizedDidMethodBuffer = Buffer.from(canonicalizedDidMethod);
    const canonicalizedDidMethodHash = ethers.utils.sha256(
      canonicalizedDidMethodBuffer
    );

    return {
      didMethods: [didMethod],
      didMethodsBuffer: [didMethodBuffer],
      canonicalizedDidMethods: [canonicalizedDidMethod],
      canonicalizedDidMethodsBuffer: [canonicalizedDidMethodBuffer],
      canonicalizedDidMethodsHash: [canonicalizedDidMethodHash],
    };
  };

  let didDocument: DidDocumentDataset;
  let updatedDidDocument: DidDocumentDataset;
  let didDocumentInvalidMethod: DidDocumentDataset;
  const controllers: ethers.Wallet[] = [];

  let didMethod: DidMethodDataset;

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      administratorsTotal: ADMINS_TOTAL,
    });
    didRegistryContract = testEnv.didRegistryContract;

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

    useContainer(app.select(JsonRpcModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    const firstAlgMultihash = testEnv.hashAlgorithms[0].multihash;

    didDocument = prepareDidDocument(controllerDid, firstAlgMultihash);
    updatedDidDocument = prepareDidDocument(controllerDid, firstAlgMultihash);
    didDocumentInvalidMethod = prepareDidDocument(
      badControllerDid,
      firstAlgMultihash
    );
    didMethod = prepareDidMethod();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(didRegistryContract));

    // Generate JWTs
    appAccessToken = await createJWT(
      { sub: "random-app" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      }
    );

    adminAccessToken = await createJWT(
      { sub: adminDid, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      }
    );

    defaultSignerSiopAccessToken = await createJWT(
      { sub: testEnv.administrators[0].did, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      }
    );

    userAccessToken = await createJWT(
      { sub: controllerDid, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      }
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  // Generic tests
  it("should reject a POST without JWT", async () => {
    expect.assertions(3);

    const response = await request(server).post("/jsonrpc").send();

    expect(response.body).toStrictEqual({
      detail: "Invalid or missing JWT",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid token", async () => {
    expect.assertions(3);

    const response = await request(server)
      .post("/jsonrpc")
      .auth("very.bad.token.123.abc", { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail:
        "Invalid Authorisation Token: invalid_argument: Incorrect format JWT",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid app token", async () => {
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = jest
      .spyOn(OAuth2Session.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.reject(new Error("error message"))
      );

    const response = await request(server)
      .post("/jsonrpc")
      .auth(appAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail: "Invalid JWT: error message",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(
      appAccessToken,
      configService.get("authorisationApiName")
    );
  });

  it("should reject a POST with an invalid user token", async () => {
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.reject(new Error("error message"))
      );

    const response = await request(server)
      .post("/jsonrpc")
      .auth(adminAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail: "Invalid JWT: error message",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(
      adminAccessToken,
      configService.get("authorisationApiDid")
    );
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    // Mock access token verification
    jest
      .spyOn(OAuth2Session.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const response = await request(server)
      .post("/jsonrpc")
      .auth(appAccessToken, { type: "bearer" })
      .send();

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
        [did, adminV1.attributeData]
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

    // Mock access token verification
    jest
      .spyOn(OAuth2Session.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(appAccessToken, { type: "bearer" })
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

    // Mock access token verification
    jest
      .spyOn(OAuth2Session.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const response = await request(server)
      .post("/jsonrpc")
      .auth(appAccessToken, { type: "bearer" })
      .send({
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

  // Only SIOP JWT are allowed to call insertAdministrator
  it("should throw an error if an app tries to call insertAdministrator", async () => {
    expect.assertions(4);

    const { did } = adminV1;

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      attributeData: adminV1.attributeData,
      did,
      from: signer.address,
    } as InsertAdministratorParam;

    // Mock access token verification
    jest
      .spyOn(OAuth2Session.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(appAccessToken, { type: "bearer" })
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
      .auth(appAccessToken, { type: "bearer" })
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
        message: `random-app is not an administrator`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the signer is not a registered admin", async () => {
    expect.assertions(4);

    const { did } = adminV1;

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      attributeData: adminV1.attributeData,
      did,
      from: signer.address,
    } as InsertAdministratorParam;

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(adminAccessToken, { type: "bearer" })
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
      .auth(adminAccessToken, { type: "bearer" })
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
        message: `${adminDid} is not an administrator`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const { did } = adminV1;

    const signer = testEnv.administrators[1].wallet;

    const param: JsonRpcParams = {
      attributeData: adminV1.attributeData,
      did,
      from: signer.address,
    } as InsertAdministratorParam;

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        message: `The DID ${
          testEnv.administrators[0].did
        } is not controlled by the address ${signer.address.toLowerCase()}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "insertDidMethod",
    "insertAdministrator",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
    "updateAdministrator(without validTo)",
    "insertHashAlgorithm",
    "updateHashAlgorithm",
    "insertPolicy",
    "updatePolicy",
    "insertDidDocument",
    "updateDidDocument",
    "insertDidController",
    "updateDidController",
    "revokeDidController",
    "updateDidMethod",
    "appendDidDocumentVersionHash",
    "appendDidDocumentVersionHash(with optional params)",
    "detachDidDocumentVersionHash",
    "appendDidDocumentVersionMetadata",
    "detachDidDocumentVersionMetadata",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const withOptionalParams = testMethod.includes("(with optional params)");
    const usingValidTo = !testMethod.includes("(without validTo)");
    const method = testMethod
      .replace("(test update attribute)", "")
      .replace("(with optional params)", "")
      .replace("(without validTo)", "");

    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      // Mock access token verification
      jest
        .spyOn(SiopSession.prototype, "verifyAccessToken")
        .mockImplementation(async () => Promise.resolve({}));

      const { did } = adminV1;
      let param: JsonRpcParams = null;
      const defaultSigner = testEnv.administrators[0].wallet;
      let signer = defaultSigner;
      let accessToken: string;

      switch (method) {
        case "insertAdministrator": {
          // create a new administrator and add attribute1
          param = {
            attributeData: adminV1.attributeData,
            did,
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "updateAdministrator": {
          if (updateAttribute) {
            // update attribute1: change it to attribute3
            param = {
              attributeData: adminV3.attributeData,
              did,
              from: signer.address,
              prevAttributeHash: ethers.utils.sha256(
                Buffer.from(adminV1.attributeData.slice(2), "hex")
              ),
            } as UpdateAdministratorParam;
          } else {
            // updateIssuer: add attribute2
            param = {
              attributeData: createAdministrator(did, usingValidTo)
                .attributeData,
              did,
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
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: signer.address,
            // ID of the hash we've just inserted via insertHashAlgorithm
            hashAlgorithmId: testEnv.hashAlgorithms.length,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
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
            canonicalizedDidDocumentHash,
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
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          accessToken = userAccessToken;

          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
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
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;

          accessToken = userAccessToken;

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
            methodName: `did:${crypto.randomBytes(8).toString("hex")}`,
            ledgerName: "ebsi-besu",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as InsertDidMethodParam;

          break;
        }
        case "updateDidMethod": {
          param = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu-2",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as UpdateDidMethodParam;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            timestampDataBuffer,
            canonicalizedDidDocumentHash,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          accessToken = userAccessToken;

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
          } as DetachDidDocumentVersionParam;

          accessToken = userAccessToken;

          break;
        }
        case "appendDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          accessToken = userAccessToken;

          break;
        }
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as DetachDidDocumentVersionMetadataParam;

          accessToken = userAccessToken;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken ?? defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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

      // Mock access token verification
      jest
        .spyOn(SiopSession.prototype, "verifyAccessToken")
        .mockImplementation(async () => Promise.resolve({}));

      const signer = testEnv.administrators[0].wallet;
      let param: JsonRpcParams = null;
      let accessToken: string;

      switch (method) {
        case "insertAdministrator": {
          param = {
            attributeData: adminV1.attributeData,
            did: adminV1.did,
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "updateAdministrator": {
          param = {
            attributeData: adminV1.attributeData,
            did: adminV1.did,
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
            multihash: "sha2-256",
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
            multihash: "sha2-256",
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
            canonicalizedDidDocumentHash,
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
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          accessToken = userAccessToken;

          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
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
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;

          accessToken = userAccessToken;

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
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as InsertDidMethodParam;

          break;
        }
        case "updateDidMethod": {
          param = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu-2",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as UpdateDidMethodParam;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          accessToken = userAccessToken;

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
          } as DetachDidDocumentVersionParam;

          accessToken = userAccessToken;

          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          accessToken = userAccessToken;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(accessToken ?? defaultSignerSiopAccessToken, { type: "bearer" })
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
      // Mock access token verification
      jest
        .spyOn(SiopSession.prototype, "verifyAccessToken")
        .mockImplementation(async () => Promise.resolve({}));

      const signer = testEnv.administrators[0].wallet;

      const testSetup: {
        params: JsonRpcParams;
        expectedErrorMessage: string;
        accessToken?: string;
      }[] = [];

      switch (method) {
        case "insertAdministrator": {
          testSetup.push({
            params: {
              did: adminV1.did,
              from: signer.address,
            } as InsertAdministratorParam,
            expectedErrorMessage:
              "Validation error: attributeData must be a hexadecimal JSON with a correct admin attribute format",
          });

          testSetup.push({
            params: {
              from: signer.address,
              attributeData: adminV1.attributeData,
            } as InsertAdministratorParam,
            expectedErrorMessage: "did must contain a valid DID method",
          });

          testSetup.push({
            params: {
              did: adminV1.did,
              attributeData: adminV1.attributeData,
              from: "bad address",
            } as InsertAdministratorParam,
            expectedErrorMessage: "from must be an Ethereum address",
          });

          break;
        }
        case "updateAdministrator": {
          testSetup.push({
            params: {
              did: adminV1.did,
              from: signer.address,
            } as UpdateAdministratorParam,
            expectedErrorMessage:
              "Validation error: attributeData must be a hexadecimal JSON with a correct admin attribute format",
          });

          testSetup.push({
            params: {
              from: signer.address,
              attributeData: adminV1.attributeData,
            } as UpdateAdministratorParam,
            expectedErrorMessage: "did must contain a valid DID method",
          });

          testSetup.push({
            params: {
              did: adminV1.did,
              attributeData: adminV1.attributeData,
              from: "bad address",
            } as UpdateAdministratorParam,
            expectedErrorMessage: "from must be an Ethereum address",
          });

          break;
        }
        case "insertHashAlgorithm": {
          testSetup.push({
            params: {
              from: signer.address,
              outputLength: -12,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 1,
              multihash: "sha2-256",
            } as InsertHashAlgorithmParam,
            expectedErrorMessage: "outputLength must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              outputLength: 256,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 3,
              multihash: "sha2-256",
            } as InsertHashAlgorithmParam,
            expectedErrorMessage: "status must not be greater than 2",
          });

          testSetup.push({
            params: {
              from: signer.address,
              outputLength: 256,
              ianaName: "",
              oid: "",
              status: 1,
              multihash: "sha-sha-sha-256",
            } as InsertHashAlgorithmParam,
            expectedErrorMessage: "multihash must be a valid multihash",
          });

          break;
        }
        case "updateHashAlgorithm": {
          testSetup.push({
            params: {
              from: signer.address,
              hashAlgorithmId: -1,
              outputLength: 256,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 1,
              multihash: "sha2-256",
            } as UpdateHashAlgorithmParam,
            expectedErrorMessage: "hashAlgorithmId must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              hashAlgorithmId: 1,
              outputLength: -1,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 1,
              multihash: "sha2-256",
            } as UpdateHashAlgorithmParam,
            expectedErrorMessage: "outputLength must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              hashAlgorithmId: 1,
              outputLength: 256,
              ianaName: "",
              oid: "",
              status: 1,
              multihash: "sha-sha-sha-256",
            } as UpdateHashAlgorithmParam,
            expectedErrorMessage: "multihash must be a valid multihash",
          });

          break;
        }
        case "insertPolicy":
        case "updatePolicy": {
          testSetup.push({
            params: {
              ...policy1,
              from: signer.address,
              policyId: undefined,
            } as InsertPolicyParam,
            expectedErrorMessage: "policyId must be a string",
          });

          testSetup.push({
            params: {
              ...policy2,
              from: signer.address,
              policyData: undefined,
            } as InsertPolicyParam,
            expectedErrorMessage: "policyData must be a hexadecimal number",
          });

          testSetup.push({
            params: {
              ...policy3,
              from: "bad address",
            } as InsertPolicyParam,
            expectedErrorMessage: "from must be an Ethereum address",
          });

          break;
        }
        case "insertDidDocument":
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;
          const randomHash = `0x${crypto.randomBytes(37).toString("hex")}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: randomHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `Hash ${randomHash}'s length (296 bits) is different from the expected length (${testEnv.hashAlgorithms[0].outputLength} bits)`,
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: "0x1234ab",
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: "didVersionInfo must be a hexadecimal JSON",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 193,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: "Can't find hash algorithm with ID: 193",
            accessToken: userAccessToken,
          });

          const randomDid = createDid();
          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(randomDid).toString("hex")}`,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `Identifier ${randomDid} doesn't match JWT's DID ${controllerDid}`,
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `Identifier ${controllerDid} doesn't match JWT's DID ${adminDid}`,
            accessToken: adminAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(adminDid).toString("hex")}`,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `DID Document's "id" ${controllerDid} doesn't match JWT's DID ${adminDid}`,
            accessToken: adminAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              // We pass an empty DID Document
              didVersionInfo: `0x${Buffer.from(JSON.stringify({})).toString(
                "hex"
              )}`,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: "DID Document is missing an id",
            accessToken: userAccessToken,
          });

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from("did:ebsi").toString("hex")}`,
              newControllerId: ethers.Wallet.createRandom().address,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage:
              "identifier must be a valid DID encoded in hexadecimal",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
              newControllerId: "0x1234",
              notBefore: 1616408985883,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage: "newControllerId must be an Ethereum address",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
              newControllerId: ethers.Wallet.createRandom().address,
              notBefore: -123,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage: "notBefore must not be less than 0",
          });

          break;
        }
        case "revokeDidController": {
          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from("did:ebsi").toString("hex")}`,
              oldControllerId: ethers.Wallet.createRandom().address,
            } as RevokeDidControllerParam,
            expectedErrorMessage:
              "identifier must be a valid DID encoded in hexadecimal",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
              oldControllerId: "0x1234",
            } as RevokeDidControllerParam,
            expectedErrorMessage: "oldControllerId must be an Ethereum address",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(controllerDid).toString("hex")}`,
            } as RevokeDidControllerParam,
            expectedErrorMessage: "oldControllerId must be an Ethereum address",
          });

          break;
        }
        case "insertDidMethod": {
          // methodSpec doesn't start with "0x"
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu",
              methodSpec: ["abc"],
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 1,
            } as InsertDidMethodParam,
            expectedErrorMessage: "each methodSpec must start with 0x",
          });

          // methodSpec isn't a valid JSON document encoded in hexadecimal
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu",
              methodSpec: ["0x"],
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 1,
            } as InsertDidMethodParam,
            expectedErrorMessage:
              "each methodSpec must be a valid JSON document encoded in hexadecimal",
          });

          // methodSpecHash doesn't start with 0x
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: ["abcd"],
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 1,
            } as InsertDidMethodParam,
            expectedErrorMessage: "each methodSpecHash must start with 0x",
          });

          // methodSpecHash is not a valid hexadecimal number
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: ["0xzz"],
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 1,
            } as InsertDidMethodParam,
            expectedErrorMessage:
              "each value in methodSpecHash must be a hexadecimal number",
          });

          // status must be comprised between 1 and 3
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 4,
            } as InsertDidMethodParam,
            expectedErrorMessage: "status must not be greater than 3",
          });

          // notBefore/notAfter must be greater than 0
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: -1,
              status: 2,
            } as InsertDidMethodParam,
            expectedErrorMessage: "notAfter must not be less than 0",
          });

          // methodName not starting with "did:"
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "method",
              ledgerName: "ebsi-besu",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: -3232818053700,
              status: 21,
            } as InsertDidMethodParam,
            expectedErrorMessage: "methodName must start with 'did:'",
          });

          break;
        }
        case "updateDidMethod": {
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu-2",
              methodSpec: ["0x"],
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 1,
            } as UpdateDidMethodParam,
            expectedErrorMessage:
              "each methodSpec must be a valid JSON document encoded in hexadecimal",
          });

          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu2",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 4,
            } as UpdateDidMethodParam,
            expectedErrorMessage: "status must not be greater than 3",
          });

          testSetup.push({
            params: {
              from: signer.address,
              methodName: "did:ebsi",
              ledgerName: "ebsi-besu2",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: -1,
              status: 1,
            } as UpdateDidMethodParam,
            expectedErrorMessage: "notAfter must not be less than 0",
          });

          // Test with an invalid method name (not starting with "did:")
          testSetup.push({
            params: {
              from: signer.address,
              methodName: "method",
              ledgerName: "ebsi-besu2",
              methodSpec: didMethod.didMethodsBuffer.map(
                (b) => `0x${b.toString("hex")}`
              ),
              methodSpecHash: didMethod.canonicalizedDidMethodsHash,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
              status: 1,
            } as InsertDidMethodParam,
            expectedErrorMessage: "methodName must start with 'did:'",
          });

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: "0xnot-a-hash",
              didVersionInfo,
              timestampData,
            } as AppendDidDocumentVersionHashParam,
            expectedErrorMessage: "hashValue must be a hexadecimal number",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: "0x1234ab",

              timestampData,
            } as AppendDidDocumentVersionHashParam,
            expectedErrorMessage: "didVersionInfo must be a hexadecimal JSON",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData: "0x1234ab",
            } as AppendDidDocumentVersionHashParam,
            expectedErrorMessage: "timestampData must be a hexadecimal JSON",
            accessToken: userAccessToken,
          });

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: "0xnot-a-hash",
              didVersionInfo,
            } as DetachDidDocumentVersionParam,
            expectedErrorMessage: "hashValue must be a hexadecimal number",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: "0x1234ab",
            } as DetachDidDocumentVersionParam,
            expectedErrorMessage: "didVersionInfo must be a hexadecimal JSON",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: -1,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
            } as DetachDidDocumentVersionParam,
            expectedErrorMessage: "hashAlgorithmId must not be less than 0",
            accessToken: userAccessToken,
          });

          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from("did:ebsi").toString("hex")}`,
              didVersionInfo,
              didVersionMetadata,
            } as AppendDidDocumentVersionMetadataParam,
            expectedErrorMessage:
              "identifier must be a valid DID encoded in hexadecimal",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              didVersionInfo: "0x1234ab",
              didVersionMetadata,
            } as AppendDidDocumentVersionMetadataParam,
            expectedErrorMessage: "didVersionInfo must be a hexadecimal JSON",
            accessToken: userAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              didVersionInfo,
              didVersionMetadata: "0x",
            } as AppendDidDocumentVersionMetadataParam,
            expectedErrorMessage:
              "didVersionMetadata must be a hexadecimal JSON",
            accessToken: userAccessToken,
          });

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      expect.assertions(testSetup.length * 2);

      await Promise.all(
        testSetup.map(async (setup) => {
          const response = await request(server)
            .post("/jsonrpc")
            .auth(setup.accessToken ?? defaultSignerSiopAccessToken, {
              type: "bearer",
            })
            .send({
              jsonrpc: "2.0",
              method,
              params: [setup.params],
              id: 231,
            });

          expect(response.body).toStrictEqual({
            jsonrpc: "2.0",
            id: 231,
            error: {
              code: -32600,
              message: expect.stringContaining(
                setup.expectedErrorMessage
              ) as string,
            },
          });
          expect(response.status).toBe(400);
        })
      );
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      // Mock access token verification
      jest
        .spyOn(SiopSession.prototype, "verifyAccessToken")
        .mockImplementation(async () => Promise.resolve({}));

      const signer = testEnv.administrators[0].wallet;

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;
      let accessToken: string;

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
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          param2 = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
            multihash: "sha2-256",
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
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          param2 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
            multihash: "sha2-256",
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
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;
          const { didDocumentBuffer: didDocumentBuffer2 } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo1 = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionInfo2 = `0x${didDocumentBuffer2.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo1,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo2,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          accessToken = userAccessToken;

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
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
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
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 2,
          } as InsertDidMethodParam;

          break;
        }
        case "updateDidMethod": {
          param1 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu-2",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as UpdateDidMethodParam;

          param2 = {
            from: signer.address,
            methodName: "did:ebsi",
            ledgerName: "ebsi-besu-xx",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonicalizedDidMethodsHash,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
            status: 1,
          } as UpdateDidMethodParam;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;
          const { didDocumentBuffer: didDocumentBuffer2 } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo1 = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionInfo2 = `0x${didDocumentBuffer2.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo1,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo2,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          accessToken = userAccessToken;

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;
          const { didDocumentBuffer: didDocumentBuffer2 } = didDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo1 = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionInfo2 = `0x${didDocumentBuffer2.toString("hex")}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo1,
          } as DetachDidDocumentVersionParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo2,
          } as DetachDidDocumentVersionParam;

          accessToken = userAccessToken;

          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;
          const tamperedDidVersionMetadata = `0x${Buffer.from(
            JSON.stringify(createMetadata())
          ).toString("hex")}`;

          param1 = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          param2 = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata: tamperedDidVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          accessToken = userAccessToken;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken ?? defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(accessToken ?? defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(accessToken ?? defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(accessToken ?? defaultSignerSiopAccessToken, { type: "bearer" })
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

  it("should throw an error if the did method is not registered", async () => {
    expect.assertions(2);
    const testMethod = "insertDidDocument";

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve({}));

    const defaultSigner = testEnv.administrators[0].wallet;
    const signer = defaultSigner;
    const {
      didDocumentBuffer,
      canonicalizedDidDocumentHash,
      timestampDataBuffer,
      didVersionMetadataBuffer,
    } = didDocumentInvalidMethod;

    const identifier = `0x${Buffer.from(badControllerDid).toString("hex")}`;
    const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
    const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
    const didVersionMetadata = `0x${didVersionMetadataBuffer.toString("hex")}`;

    controllers.push(signer);

    const param: JsonRpcParams = {
      from: signer.address,
      identifier,
      hashAlgorithmId: 0,
      hashValue: canonicalizedDidDocumentHash,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    } as InsertDidDocumentParam;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: testMethod,
        params: [param],
        id: 231,
      });

    expect(responseBuild.body).toStrictEqual({
      error: {
        code: -32600,
        message: expect.stringContaining(
          "identifier must be a valid DID encoded in hexadecimal"
        ) as string,
      },
      id: 231,
      jsonrpc: "2.0",
    });
    expect(responseBuild.status).toBe(400);
  });
});
