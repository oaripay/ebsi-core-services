import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
  MockInstance,
} from "vitest";
import { randomBytes } from "node:crypto";
import axios from "axios";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  type GenerateKeyPairResult,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry-v2";
import { computeId, methodNotAllowed } from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/schemaRegistry.js";
import {
  createDid,
  createSchema,
  createVerifiableAuthorisationSchema,
} from "../../../tests/utils/data.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import type { InsertSchemaSchema } from "./validators/RequestInsertSchemaSchema.js";
import type { UpdateSchemaSchema } from "./validators/RequestUpdateSchemaSchema.js";
import type { UpdateMetadataSchema } from "./validators/RequestUpdateMetadataSchema.js";
import type { UnsignedTransaction } from "./validators/RequestSendSignedTransactionSchema.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertSchemaSchema
  | UpdateSchemaSchema
  | UpdateMetadataSchema;

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let schemasRegistryContract: SchemaSCRegistry;
  let jsonRpcService: JsonRpcService;
  let ledgerService: LedgerService;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let userAccessToken: string;
  let userAccessTokenPayload: Record<string, unknown>;
  let defaultSignerSiopAccessToken: string;
  let defaultSignerSiopAccessTokenPayload: Record<string, unknown>;
  let configService: ConfigService<ApiConfig, true>;
  let isDidControlledByAddressMock: MockInstance;

  const adminDid = createDid();

  let schemaId: string;
  const rawSchema = createSchema();
  const serializedSchema = JSON.stringify(rawSchema);
  const serializedSchemaBuffer = Buffer.from(serializedSchema);

  const rawUpdatedSchema = {
    ...rawSchema,
    description: "Updated schema of an EBSI Verifiable Attestation",
  };
  const serializedUpdatedSchema = JSON.stringify(rawUpdatedSchema);
  const serializedUpdatedSchemaBuffer = Buffer.from(serializedUpdatedSchema);

  let schema2Id: string;
  const referencedSchemaUrl =
    "https://test.ebsi/trusted-schemas-registry/v3/schemas/z3kRpVjUFj4Bq8qHRENUHiZrVF5VgMBUe7biEafp1wf2J";
  const rawSchema2 = createVerifiableAuthorisationSchema(referencedSchemaUrl);
  const serializedSchema2 = JSON.stringify(rawSchema2);
  const serializedSchema2Buffer = Buffer.from(serializedSchema2);

  const rawMetadata = {
    meta: "value",
  };
  const serializedMetadata = JSON.stringify(rawMetadata);
  const serializedMetadataBuffer = Buffer.from(serializedMetadata);

  const rawMetadata2 = {
    meta: "value2",
  };
  const serializedMetadata2 = JSON.stringify(rawMetadata2);
  const serializedMetadataBuffer2 = Buffer.from(serializedMetadata2);

  const rawUpdatedMetadata = {
    meta: "value3",
  };
  const serializedUpdatedMetadata = JSON.stringify(rawUpdatedMetadata);
  const serializedUpdatedMetadataBuffer = Buffer.from(
    serializedUpdatedMetadata,
  );

  const mockServer = setupServer();

  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });

    // Compute IDs. We need to mock the request GET $referencedSchemaUrl because rawSchema2 depends on it
    mockServer.use(
      http.get(referencedSchemaUrl, () => HttpResponse.json(rawSchema)),
    );

    schemaId = `0x${(await computeId(rawSchema)).toString("hex")}`;
    schema2Id = `0x${(await computeId(rawSchema2)).toString("hex")}`;

    mockServer.resetHandlers();

    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
    schemasRegistryContract = testEnv.schemasRegistryContract;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => schemasRegistryContract.address,
    );

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    userAccessTokenPayload = {
      sub: adminDid,
      scp: "openid tsr_write",
    };
    userAccessToken = await new SignJWT(userAccessTokenPayload)
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    defaultSignerSiopAccessTokenPayload = {
      sub: testEnv.user.did,
      scp: "openid tsr_write",
    };

    defaultSignerSiopAccessToken = await new SignJWT(
      defaultSignerSiopAccessTokenPayload,
    )
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    // Mock Auth API
    const authorisationApiUrl = configService.get<string>(
      "authorisationApiUrl",
    );

    mockServer.use(
      // Mock Auth API /.well-known/openid-configuration endpoint
      http.get(`${authorisationApiUrl}/.well-known/openid-configuration`, () =>
        HttpResponse.json({ jwks_uri: `${authorisationApiUrl}/jwks` }),
      ),
      // Mock Auth API /jwks endpoint
      http.get(`${authorisationApiUrl}/jwks`, () =>
        HttpResponse.json({
          keys: [{ ...publicKeyJwk, kid: authApiKid }],
        }),
      ),
    );
  });

  beforeEach(() => {
    // Mock TSR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => testEnv.schemasRegistryContract,
    );

    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(async () =>
      Promise.resolve(true),
    );

    // Mock $ref response
    mockServer.use(
      http.get(referencedSchemaUrl, () => HttpResponse.json(rawSchema)),
    );
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  it("should throw an error if the DID does not exist", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      from: signer.address,
      schemaId,
      schema: `0x${serializedSchemaBuffer.toString("hex")}`,
      metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
    } satisfies InsertSchemaSchema;

    // The DID does not exist
    vi.spyOn(axios, "post").mockImplementation((url: string) => {
      if (url.includes(`/identifiers/${testEnv.user.did}/actions`)) {
        return Promise.resolve({
          data: {
            jsonrpc: "2.0",
            error: { code: -32600, message: "did doesn't exist" },
            id: null,
          },
          status: 400,
        });
      }
      throw new Error(`Forgot to mock an axios call? POST ${url}`);
    });
    isDidControlledByAddressMock.mockRestore();

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertSchema",
        params: [param],
        id: 231,
      });

    expect(responseBuild.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 231,
      result: {
        chainId: expect.any(String),
        data: expect.any(String),
        from: param.from,
        gasLimit: expect.any(String),
        gasPrice: expect.any(String),
        nonce: expect.any(String),
        to: expect.any(String),
        value: "0x0",
      },
    });
    expect(responseBuild.status).toBe(200);

    const unsignedTransaction = responseBuild.body.result;
    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(
        JSON.stringify(unsignedTransaction),
      ) as unknown as UnsignedTransaction,
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await signer.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
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
        message: `The DID ${testEnv.user.did} does not exist`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
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
      (response.headers as { "content-type": string })["content-type"],
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
        "Invalid Authorisation Token: Only JWTs using Compact JWS serialization can be decoded",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid access token", async () => {
    expect.assertions(6);

    const signer = await generateKeyPair("ES256");
    const kid = await calculateJwkThumbprint(await exportJWK(signer.publicKey));
    const accessTokenWithInvalidKid = await new SignJWT(userAccessTokenPayload)
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid,
      })
      .sign(signer.privateKey);

    let response = await request(server)
      .post("/jsonrpc")
      .auth(accessTokenWithInvalidKid, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail:
        "Invalid Access Token. Couldn't find a public key related to the given kid.",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));

    const accessTokenWithInvalidSignature = await new SignJWT(
      userAccessTokenPayload,
    )
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(signer.privateKey);

    response = await request(server)
      .post("/jsonrpc")
      .auth(accessTokenWithInvalidSignature, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail: "Access Token signature validation failed",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      error: {
        code: -32600,
        message: "JSON-RPC payload must be an object",
      },
      id: null,
      jsonrpc: "2.0",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: schemasRegistryContract.address,
      data: schemasRegistryContract.interface.encodeFunctionData(
        "insertSchema",
        [schemaId, serializedSchemaBuffer, serializedMetadataBuffer],
      ),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction,
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
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

    const { chainId } = await schemasRegistryContract.provider.getNetwork();
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

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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
          "The method 'unknown-method' is invalid",
        ),
      },
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      from: signer.address,
      schemaId,
      schema: `0x${serializedSchemaBuffer.toString("hex")}`,
      metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
    } satisfies InsertSchemaSchema;

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      async () => Promise.resolve(false),
    );

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertSchema",
        params: [param],
        id: 231,
      });

    expect(responseBuild.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 231,
      result: {
        chainId: expect.any(String),
        data: expect.any(String),
        from: param.from,
        gasLimit: expect.any(String),
        gasPrice: expect.any(String),
        nonce: expect.any(String),
        to: expect.any(String),
        value: "0x0",
      },
    });
    expect(responseBuild.status).toBe(200);

    const unsignedTransaction = responseBuild.body.result;
    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(
        JSON.stringify(unsignedTransaction),
      ) as unknown as UnsignedTransaction,
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await signer.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
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
        message: `The DID ${testEnv.user.did} is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the schema references an URL that can't be fetched", async () => {
    expect.assertions(2);

    // Mock $ref response - 404
    mockServer.resetHandlers();
    mockServer.use(
      http.get(referencedSchemaUrl, () =>
        HttpResponse.text("Not Found", { status: 404 }),
      ),
    );

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      from: signer.address,
      schemaId: schema2Id,
      schema: `0x${serializedSchema2Buffer.toString("hex")}`,
      metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
    } satisfies InsertSchemaSchema;

    const response: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertSchema",
        params: [param],
        id: 231,
      });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 231,
      error: {
        code: -32600,
        message: expect.stringContaining(
          `Error downloading ${referencedSchemaUrl}`,
        ),
      },
    });
    expect(response.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each(["insertSchema", "updateSchema", "updateMetadata"])(
    "/jsonrpc with method %s",
    (testMethod: string) => {
      const method = testMethod.replace("(test update attribute)", "");

      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(4);

        let param: JsonRpcParams | null = null;

        const signer = ethers.Wallet.createRandom();

        switch (method) {
          case "insertSchema": {
            param = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies InsertSchemaSchema;
            break;
          }
          case "updateSchema": {
            param = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedUpdatedMetadataBuffer.toString("hex")}`,
            } satisfies UpdateSchemaSchema;
            break;
          }
          case "updateMetadata": {
            param = {
              from: signer.address,
              schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
            } satisfies UpdateMetadataSchema;
            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
            chainId: expect.any(String),
            data: expect.any(String),
            from: param.from,
            gasLimit: expect.any(String),
            gasPrice: expect.any(String),
            nonce: expect.any(String),
            to: expect.any(String),
            value: "0x0",
          },
        });
        expect(responseBuild.status).toBe(200);

        const unsignedTransaction = responseBuild.body.result;
        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as unknown as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await signer.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
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
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);
      });

      it("should accept a request without id", async () => {
        expect.assertions(2);

        const signer = ethers.Wallet.createRandom();

        let param: JsonRpcParams | null = null;

        switch (method) {
          case "insertSchema": {
            param = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies InsertSchemaSchema;
            break;
          }
          case "updateSchema": {
            param = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies UpdateSchemaSchema;
            break;
          }
          case "updateMetadata": {
            param = {
              from: signer.address,
              schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
            } satisfies UpdateMetadataSchema;
            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        const responseBuild = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param],
            // no id defined
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: null,
          result: expect.objectContaining({}),
        });
        expect(responseBuild.status).toBe(200);
      });

      it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
        expect.assertions(6);

        const signer = ethers.Wallet.createRandom();

        const testSetup: {
          params: JsonRpcParams;
          expectedErrorMessages: string[];
        }[] = [];

        switch (method) {
          case "insertSchema": {
            // `schema` param is not valid JSON encoded in hex
            testSetup.push({
              params: {
                from: signer.address,
                schemaId,
                schema: "0x1234",
                metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              } satisfies InsertSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schema': Must be a JSON object encoded in hexadecimal",
              ],
            });

            // `metadata` param is not valid JSON encoded in hex
            testSetup.push({
              params: {
                from: signer.address,
                schemaId,
                schema: `0x${serializedSchemaBuffer.toString("hex")}`,
                metadata: "0x1234",
              } satisfies InsertSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
              ],
            });

            // `metadata` param doesn't start with 0x
            testSetup.push({
              params: {
                from: signer.address,
                schemaId,
                schema: `0x${serializedSchemaBuffer.toString("hex")}`,
                metadata: serializedMetadataBuffer.toString("hex"),
              } satisfies InsertSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.metadata': Must start with 0x",
              ],
            });

            // Multiple errors at the same time
            testSetup.push({
              params: {
                from: signer.address,
                schemaId: "42",
                schema: "0x123",
                metadata: "0x1234",
              } satisfies InsertSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schemaId': Must start with 0x",
                "Invalid 'params.0.schema': Length must be even",
                "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
              ],
            });

            // `schemaId` param doesn't match the computed schema ID
            const randomSchemaId = `0x${randomBytes(32).toString("hex")}`;
            testSetup.push({
              params: {
                from: signer.address,
                schemaId: randomSchemaId,
                schema: `0x${serializedSchemaBuffer.toString("hex")}`,
                metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              } satisfies InsertSchemaSchema,
              expectedErrorMessages: [
                `Invalid 'params.0.schemaId': "${randomSchemaId}" is different from the actual schema ID "${schemaId}"`,
              ],
            });

            break;
          }
          case "updateSchema": {
            // `schema` param is not valid JSON encoded in hex
            testSetup.push({
              params: {
                from: signer.address,
                schemaId,
                schema: "0x1234",
                metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              } satisfies UpdateSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schema': Must be a JSON object encoded in hexadecimal",
              ],
            });

            // `metadata` param is not valid JSON encoded in hex
            testSetup.push({
              params: {
                from: signer.address,
                schemaId,
                schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
                metadata: "0x1234",
              } satisfies UpdateSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
              ],
            });

            // `schemaId` is not an hex string
            testSetup.push({
              params: {
                from: signer.address,
                schemaId: "11.11.2011",
                schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
                metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              } satisfies UpdateSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schemaId': Must start with 0x",
              ],
            });

            // Multiple errors at the same time
            testSetup.push({
              params: {
                from: signer.address,
                schemaId: "42",
                schema: "0x123",
                metadata: "0x1234",
              } satisfies UpdateSchemaSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schemaId': Must start with 0x",
                "Invalid 'params.0.schema': Length must be even",
                "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
              ],
            });

            // the user tries to insert breaking changes (update schema1 with schema2)
            testSetup.push({
              params: {
                from: signer.address,
                schemaId,
                schema: `0x${serializedSchema2Buffer.toString("hex")}`,
                metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
              } satisfies UpdateSchemaSchema,
              expectedErrorMessages: [
                `Invalid 'params.0.schemaId': "${schemaId}" is different from the actual schema ID "${schema2Id}"`,
              ],
            });

            break;
          }
          case "updateMetadata": {
            testSetup.push({
              params: {
                from: signer.address,
                schemaRevisionId: "1234",
                metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
              } satisfies UpdateMetadataSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schemaRevisionId': Must start with 0x",
              ],
            });

            testSetup.push({
              params: {
                from: signer.address,
                schemaRevisionId: "0x",
                metadata: "0x1234",
              } satisfies UpdateMetadataSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schemaRevisionId': Must be hexadecimal",
                "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
              ],
            });

            testSetup.push({
              params: {
                from: signer.address,
                schemaRevisionId: "0x",
                metadata: serializedMetadataBuffer.toString("hex"),
              } satisfies UpdateMetadataSchema,
              expectedErrorMessages: [
                "Invalid 'params.0.schemaRevisionId': Must be hexadecimal",
                "Invalid 'params.0.metadata': Must start with 0x",
              ],
            });

            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        expect.assertions(testSetup.length * 3);

        // eslint-disable-next-line no-restricted-syntax
        for (const setup of testSetup) {
          // eslint-disable-next-line no-await-in-loop
          const response = await request(server)
            .post("/jsonrpc")
            .auth(defaultSignerSiopAccessToken, {
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
              message: expect.any(String),
            },
          });
          expect(
            (
              response.body as { error: { message: string } }
            ).error.message.split("\n"),
          ).toStrictEqual(expect.arrayContaining(setup.expectedErrorMessages));
          expect(response.status).toBe(400);
        }
      });

      it("should throw an error when the unsignedTransaction has been tampered", async () => {
        expect.assertions(6);

        const signer = ethers.Wallet.createRandom();

        let param1: JsonRpcParams;
        let param2: JsonRpcParams;

        const metadata2 = {
          meta: "another value",
        };

        switch (method) {
          case "insertSchema": {
            param1 = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies InsertSchemaSchema;

            param2 = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              metadata: `0x${Buffer.from(JSON.stringify(metadata2)).toString(
                "hex",
              )}`,
            } satisfies InsertSchemaSchema;

            break;
          }
          case "updateSchema": {
            param1 = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies UpdateSchemaSchema;

            param2 = {
              from: signer.address,
              schemaId,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              metadata: `0x${Buffer.from(JSON.stringify(metadata2)).toString(
                "hex",
              )}`,
            } satisfies UpdateSchemaSchema;

            break;
          }
          case "updateMetadata": {
            param1 = {
              from: signer.address,
              schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
            } satisfies UpdateMetadataSchema;

            param2 = {
              from: signer.address,
              schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies UpdateMetadataSchema;
            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        const responseBuild1: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
          JSON.parse(
            JSON.stringify(transaction1),
          ) as unknown as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx1 = await randomSigner.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

        // Tampering signatures
        const responseSend1 = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
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
              "does not match with the signedRawTransaction",
            ),
          },
        });
        expect(responseSend1.status).toBe(400);

        // Tampering "from"
        transaction1.from = transaction2.from;
        const responseSend2 = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
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
              "does not match with unsignedTransaction.from",
            ),
          },
        });
        expect(responseSend1.status).toBe(400);
      });
    },
  );
});
