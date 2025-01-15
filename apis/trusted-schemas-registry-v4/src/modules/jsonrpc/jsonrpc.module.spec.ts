import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { computeId, methodNotAllowed } from "@ebsiint-api/shared";
import { TrustedSchemasRegistry } from "@ebsiint-sc/trusted-schemas-registry-v3";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ethers } from "ethers";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  type GenerateKeyPairResult,
  SignJWT,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { randomBytes } from "node:crypto";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ApiConfig } from "../../config/configuration.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import type { InsertSchemaSchema } from "./validators/RequestInsertSchemaSchema.js";
import type { UnsignedTransaction } from "./validators/RequestSendSignedTransactionSchema.js";
import type { UpdateMetadataSchema } from "./validators/RequestUpdateMetadataSchema.js";
import type { UpdateSchemaSchema } from "./validators/RequestUpdateSchemaSchema.js";

import {
  createDid,
  createSchema,
  createVerifiableAuthorisationSchema,
} from "../../../tests/utils/data.js";
import { setupTestEnv } from "../../../tests/utils/schemaRegistry.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";

type JsonRpcParams =
  | InsertSchemaSchema
  | UpdateMetadataSchema
  | UpdateSchemaSchema;

interface SupertestJsonRpcResponse {
  body: JsonRpcResponseObject;
  status: number;
}

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let schemasRegistryContract: TrustedSchemasRegistry;
  let jsonRpcService: JsonRpcService;
  let ledgerService: LedgerService;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let userAccessToken: string;
  let userAccessTokenPayload: Record<string, unknown>;
  let defaultSignerSiopAccessToken: string;
  let defaultSignerSiopAccessTokenPayload: Record<string, unknown>;
  let configService: ConfigService<ApiConfig, true>;

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

        print.error();
      },
    });

    // Compute IDs. We need to mock the request GET $referencedSchemaUrl because rawSchema2 depends on it
    mockServer.use(
      http.get(referencedSchemaUrl, () => HttpResponse.json(rawSchema)),
    );

    const schemaIdBuffer = await computeId(rawSchema);
    schemaId = `0x${schemaIdBuffer.toString("hex")}`;
    const schema2IdBuffer = await computeId(rawSchema2);
    schema2Id = `0x${schema2IdBuffer.toString("hex")}`;

    mockServer.resetHandlers();

    // Spin up test blockchain
    testEnv = await setupTestEnv();
    schemasRegistryContract = testEnv.schemasRegistryContract;
    const schemasRegistryContractAddress =
      await schemasRegistryContract.getAddress();

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => schemasRegistryContractAddress,
    );

    // Start server
    const moduleFixture = await Test.createTestingModule({
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
      scp: "openid tsr_write",
      sub: adminDid,
    };
    userAccessToken = await new SignJWT(userAccessTokenPayload)
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    defaultSignerSiopAccessTokenPayload = {
      scp: "openid tsr_write",
      sub: testEnv.user.did,
    };

    defaultSignerSiopAccessToken = await new SignJWT(
      defaultSignerSiopAccessTokenPayload,
    )
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);
  });

  beforeEach(async () => {
    // Mock TSR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => testEnv.schemasRegistryContract,
    );
    vi.spyOn(ledgerService, "getEthersProvider").mockImplementation(
      // @ts-expect-error Error due to a mismatch between ESM and CommonJS modules
      () => testEnv.provider,
    );

    // For the tests, we assume that the DID is controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      () => Promise.resolve(true),
    );

    // Mock $ref response
    mockServer.use(
      http.get(referencedSchemaUrl, () => HttpResponse.json(rawSchema)),
    );

    // Mock Auth API
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    const authorisationApiUrl = configService.get("authorisationApiUrl", {
      infer: true,
    });

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

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(async () => {
    mockServer.close();

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
        alg: "ES256",
        kid,
        typ: "JWT",
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
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
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
        code: -32_600,
        message: "JSON-RPC payload must be an object",
      },
      // eslint-disable-next-line unicorn/no-null
      id: null,
      jsonrpc: "2.0",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      chainId: "0x1b3b",
      data: schemasRegistryContract.interface.encodeFunctionData(
        "insertSchema",
        [schemaId, serializedSchemaBuffer, serializedMetadataBuffer],
      ),
      from: wallet.address,
      gasLimit: "0x1000000",
      gasPrice: "0x00",
      nonce: "0x00",
      to: await schemasRegistryContract.getAddress(),
      value: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      // eslint-disable-next-line unicorn/prefer-structured-clone
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction,
    );

    const sgnTx = await wallet.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        id: "45",
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
        params: [
          {
            protocol: "eth",
            r,
            s,
            signedRawTransaction: sgnTx,
            unsignedTransaction: transaction,
            v: `0x${v.toString(16)}`,
          },
        ],
      });

    const { chainId } = await testEnv.provider.getNetwork();
    const actualChainId = `0x${BigInt(chainId).toString(16)}`;

    expect(responseSend.body).toStrictEqual({
      error: {
        code: -32_600,
        message: `Invalid unsignedTransaction.chainId. Expected ${actualChainId}. Received 0x1b3b`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an Invalid Request error for bad method", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        id: 123,
        jsonrpc: "2.0",
        method: "unknown-method",
        params: [],
      });

    expect(response.body).toStrictEqual({
      error: {
        code: -32_600,
        message: expect.stringContaining(
          "The method 'unknown-method' is invalid",
        ),
      },
      id: 123,
      jsonrpc: "2.0",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      from: signer.address,
      metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
      schema: `0x${serializedSchemaBuffer.toString("hex")}`,
      schemaId,
    } satisfies InsertSchemaSchema;

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      () => Promise.resolve(false),
    );

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertSchema",
        params: [param],
      });

    expect(responseBuild.body).toStrictEqual({
      id: 231,
      jsonrpc: "2.0",
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
      // eslint-disable-next-line unicorn/prefer-structured-clone
      JSON.parse(
        JSON.stringify(unsignedTransaction),
      ) as unknown as UnsignedTransaction,
    );

    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        id: "45",
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
        params: [
          {
            protocol: "eth",
            r,
            s,
            signedRawTransaction: sgnTx,
            unsignedTransaction,
            v: `0x${v.toString(16)}`,
          },
        ],
      });

    expect(responseSend.body).toStrictEqual({
      error: {
        code: -32_600,
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
      metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
      schema: `0x${serializedSchema2Buffer.toString("hex")}`,
      schemaId: schema2Id,
    } satisfies InsertSchemaSchema;

    const response: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertSchema",
        params: [param],
      });

    expect(response.body).toStrictEqual({
      error: {
        code: -32_600,
        message: expect.stringContaining(
          `Error downloading ${referencedSchemaUrl}`,
        ),
      },
      id: 231,
      jsonrpc: "2.0",
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

        let param: JsonRpcParams;

        const signer = ethers.Wallet.createRandom();

        switch (method) {
          case "insertSchema": {
            param = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies InsertSchemaSchema;
            break;
          }
          case "updateMetadata": {
            param = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
              schemaRevisionId: ethers.sha256(serializedSchemaBuffer),
            } satisfies UpdateMetadataSchema;
            break;
          }
          case "updateSchema": {
            param = {
              from: signer.address,
              metadata: `0x${serializedUpdatedMetadataBuffer.toString("hex")}`,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies UpdateSchemaSchema;
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
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param],
          });

        expect(responseBuild.body).toStrictEqual({
          id: 231,
          jsonrpc: "2.0",
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
          // eslint-disable-next-line unicorn/prefer-structured-clone
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as unknown as UnsignedTransaction,
        );

        const sgnTx = await signer.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        const responseSend = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            id: "45",
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                r,
                s,
                signedRawTransaction: sgnTx,
                unsignedTransaction,
                v: `0x${v.toString(16)}`,
              },
            ],
          });

        expect(responseSend.body).toStrictEqual({
          id: "45",
          jsonrpc: "2.0",
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);
      });

      it("should accept a request without id", async () => {
        expect.assertions(2);

        const signer = ethers.Wallet.createRandom();

        let param: JsonRpcParams;

        switch (method) {
          case "insertSchema": {
            param = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies InsertSchemaSchema;
            break;
          }
          case "updateMetadata": {
            param = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
              schemaRevisionId: ethers.sha256(serializedSchemaBuffer),
            } satisfies UpdateMetadataSchema;
            break;
          }
          case "updateSchema": {
            param = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies UpdateSchemaSchema;
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
          // eslint-disable-next-line unicorn/no-null
          id: null,
          jsonrpc: "2.0",
          result: expect.objectContaining({}),
        });
        expect(responseBuild.status).toBe(200);
      });

      it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
        expect.assertions(6);

        const signer = ethers.Wallet.createRandom();

        const testSetup: {
          expectedErrorMessages: string[];
          params: JsonRpcParams;
        }[] = [];

        switch (method) {
          case "insertSchema": {
            testSetup.push(
              // `schema` param is not valid JSON encoded in hex
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schema': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
                  schema: "0x1234",
                  schemaId,
                } satisfies InsertSchemaSchema,
              },
              // `metadata` param is not valid JSON encoded in hex
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: "0x1234",
                  schema: `0x${serializedSchemaBuffer.toString("hex")}`,
                  schemaId,
                } satisfies InsertSchemaSchema,
              },
              // `metadata` param doesn't start with 0x
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.metadata': Must start with 0x",
                ],
                params: {
                  from: signer.address,
                  metadata: serializedMetadataBuffer.toString("hex"),
                  schema: `0x${serializedSchemaBuffer.toString("hex")}`,
                  schemaId,
                } satisfies InsertSchemaSchema,
              },
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schemaId': Must start with 0x",
                  "Invalid 'params.0.schema': Length must be even",
                  "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: "0x1234",
                  schema: "0x123",
                  schemaId: "42",
                } satisfies InsertSchemaSchema,
              },
            );

            // `schemaId` param doesn't match the computed schema ID
            const randomSchemaId = `0x${randomBytes(32).toString("hex")}`;
            testSetup.push({
              expectedErrorMessages: [
                `Invalid 'params.0.schemaId': "${randomSchemaId}" is different from the actual schema ID "${schemaId}"`,
              ],
              params: {
                from: signer.address,
                metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
                schema: `0x${serializedSchemaBuffer.toString("hex")}`,
                schemaId: randomSchemaId,
              } satisfies InsertSchemaSchema,
            });

            break;
          }
          case "updateMetadata": {
            testSetup.push(
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schemaRevisionId': Must start with 0x",
                ],
                params: {
                  from: signer.address,
                  metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
                  schemaRevisionId: "1234",
                } satisfies UpdateMetadataSchema,
              },
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schemaRevisionId': Must be hexadecimal",
                  "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: "0x1234",
                  schemaRevisionId: "0x",
                } satisfies UpdateMetadataSchema,
              },
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schemaRevisionId': Must be hexadecimal",
                  "Invalid 'params.0.metadata': Must start with 0x",
                ],
                params: {
                  from: signer.address,
                  metadata: serializedMetadataBuffer.toString("hex"),
                  schemaRevisionId: "0x",
                } satisfies UpdateMetadataSchema,
              },
            );

            break;
          }
          case "updateSchema": {
            testSetup.push(
              // `schema` param is not valid JSON encoded in hex
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schema': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
                  schema: "0x1234",
                  schemaId,
                } satisfies UpdateSchemaSchema,
              },
              // `metadata` param is not valid JSON encoded in hex
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: "0x1234",
                  schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
                  schemaId,
                } satisfies UpdateSchemaSchema,
              },
              // `schemaId` is not an hex string
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schemaId': Must start with 0x",
                ],
                params: {
                  from: signer.address,
                  metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
                  schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
                  schemaId: "11.11.2011",
                } satisfies UpdateSchemaSchema,
              },
              {
                expectedErrorMessages: [
                  "Invalid 'params.0.schemaId': Must start with 0x",
                  "Invalid 'params.0.schema': Length must be even",
                  "Invalid 'params.0.metadata': Must be a JSON object encoded in hexadecimal",
                ],
                params: {
                  from: signer.address,
                  metadata: "0x1234",
                  schema: "0x123",
                  schemaId: "42",
                } satisfies UpdateSchemaSchema,
              },
              // the user tries to insert breaking changes (update schema1 with schema2)
              {
                expectedErrorMessages: [
                  `Invalid 'params.0.schemaId': "${schemaId}" is different from the actual schema ID "${schema2Id}"`,
                ],
                params: {
                  from: signer.address,
                  metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
                  schema: `0x${serializedSchema2Buffer.toString("hex")}`,
                  schemaId,
                } satisfies UpdateSchemaSchema,
              },
            );

            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        expect.assertions(testSetup.length * 3);

        for (const setup of testSetup) {
          const response = await request(server)
            .post("/jsonrpc")
            .auth(defaultSignerSiopAccessToken, {
              type: "bearer",
            })
            .send({
              id: 231,
              jsonrpc: "2.0",
              method,
              params: [setup.params],
            });

          expect(response.body).toStrictEqual({
            error: {
              code: -32_600,
              message: expect.any(String),
            },
            id: 231,
            jsonrpc: "2.0",
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
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies InsertSchemaSchema;

            param2 = {
              from: signer.address,
              metadata: `0x${Buffer.from(JSON.stringify(metadata2)).toString(
                "hex",
              )}`,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies InsertSchemaSchema;

            break;
          }
          case "updateMetadata": {
            param1 = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
              schemaRevisionId: ethers.sha256(serializedSchemaBuffer),
            } satisfies UpdateMetadataSchema;

            param2 = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              schemaRevisionId: ethers.sha256(serializedSchemaBuffer),
            } satisfies UpdateMetadataSchema;
            break;
          }
          case "updateSchema": {
            param1 = {
              from: signer.address,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies UpdateSchemaSchema;

            param2 = {
              from: signer.address,
              metadata: `0x${Buffer.from(JSON.stringify(metadata2)).toString(
                "hex",
              )}`,
              schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
              schemaId,
            } satisfies UpdateSchemaSchema;

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
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param1],
          });

        expect(responseBuild1.status).toBe(200);

        const transaction1 = responseBuild1.body.result as UnsignedTransaction;

        const responseBuild2: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            id: 232,
            jsonrpc: "2.0",
            method,
            params: [param2],
          });

        expect(responseBuild2.status).toBe(200);
        const transaction2 = responseBuild2.body.result as UnsignedTransaction;

        const randomSigner = ethers.Wallet.createRandom();

        const uTx = formatEthersUnsignedTransaction(
          // eslint-disable-next-line unicorn/prefer-structured-clone
          JSON.parse(
            JSON.stringify(transaction1),
          ) as unknown as UnsignedTransaction,
        );

        const sgnTx1 = await randomSigner.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx1).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        // Tampering signatures
        const responseSend1 = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            id: "45",
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                r,
                s,
                signedRawTransaction: sgnTx1,
                unsignedTransaction: transaction2,
                v: `0x${v.toString(16)}`,
              },
            ],
          });

        expect(responseSend1.body).toStrictEqual({
          error: {
            code: -32_600,
            message: expect.stringContaining(
              "does not match with the signedRawTransaction",
            ),
          },
          id: "45",
          jsonrpc: "2.0",
        });
        expect(responseSend1.status).toBe(400);

        // Tampering "from"
        transaction1.from = transaction2.from;
        const responseSend2 = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            id: "46",
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                r,
                s,
                signedRawTransaction: sgnTx1,
                unsignedTransaction: transaction1,
                v: `0x${v.toString(16)}`,
              },
            ],
          });

        expect(responseSend2.body).toStrictEqual({
          error: {
            code: -32_600,
            message: expect.stringContaining(
              "does not match with unsignedTransaction.from",
            ),
          },
          id: "46",
          jsonrpc: "2.0",
        });
        expect(responseSend1.status).toBe(400);
      });
    },
  );
});
