import { randomBytes } from "node:crypto";
import {
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  afterEach,
  vi,
} from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ethers } from "ethers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace";
import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
} from "jose";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import { util } from "@cef-ebsi/key-did-resolver";
import hre from "hardhat";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import { DEPENDENCIES, type ApiConfig } from "./config/configuration.js";
import { setupTestEnv } from "../tests/utils/trackAndTrace.js";
import { LedgerService } from "./modules/ledger/ledger.service.js";
import type { JsonRpcResponseObject } from "./modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "./modules/jsonrpc/jsonrpc.utils.js";
import type {
  Document,
  DocumentAccesses,
  Event,
} from "./modules/documents/documents.interface.js";
import type {
  AuthoriseDidSchema,
  CreateDocumentSchema,
  WriteEventSchema,
  UnsignedTransaction,
  RemoveDocumentSchema,
  GrantAccessSchema,
  RevokeAccessSchema,
} from "./modules/jsonrpc/validators/index.js";
import { didToHex } from "./shared/utils.js";
import { Permission, AccountType } from "./shared/constants.js";

interface ResponseHeaders {
  "ebsi-image-tag": string;
  [key: string]: string;
}

interface Actor {
  did: string;
  wallet: ethers.Wallet;
}

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

describe("App Module", () => {
  const mockServer = setupServer();

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url}`);
      },
    });
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe("onApplicationBootstrap hook", () => {
    afterEach(() => {
      mockServer.resetHandlers();
    });

    it("should prevent the app from starting if the url of a dependency is not mocked with MSW", async () => {
      expect.assertions(1);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;
      const url = configService
        .get<string>("ledgerApiUrl")
        .replace(domain, localOrigin);

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url}, shutting down...`,
      );

      await app.close();
    });

    it("should prevent the app from starting if one of the dependencies still responds with a 404 after all the attempts", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;
      const url = configService
        .get<string>("ledgerApiUrl")
        .replace(domain, localOrigin);

      mockServer.use(
        http.get(url, () => HttpResponse.text("Not Found", { status: 404 })),
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url}, shutting down...`,
      );

      // Retry 30 times -> log 30 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(30);

      await app.close();
    });

    it("should start if all the dependencies are up and running", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;

      const ledgerApiUrl = configService
        .get<string>("ledgerApiUrl")
        .replace(domain, localOrigin);
      const authorisationApiUrl = `${configService.get<string>(
        "authorisationApiUrl",
      )}`.replace(domain, localOrigin);

      let reqCounter = 0;
      mockServer.use(
        http.get(ledgerApiUrl, () => {
          reqCounter += 1;

          // Ledger API first responds 15 times with a 404 (because it's starting)
          if (reqCounter <= 15) {
            return HttpResponse.text("Not Found", { status: 404 });
          }

          // Then, it responds with a 200
          return HttpResponse.json({});
        }),
        http.get(authorisationApiUrl, () => HttpResponse.json({})),
      );

      await expect(app.init()).resolves.not.toThrow();

      // Retry 15 times -> log 15 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(15);

      await app.close();
    });
  });

  describe("Generic tests", () => {
    let app: NestFastifyApplication;
    let server: RawServerDefault;
    let configService: ConfigService<ApiConfig, true>;
    const dockerTag = "version";

    beforeAll(async () => {
      process.env.DOCKER_TAG = dockerTag;

      // Start server
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;

      // Mock dependencies
      const ledgerApiUrl = configService
        .get<string>("ledgerApiUrl")
        .replace(domain, localOrigin);
      const authorisationApiUrl = `${configService.get<string>(
        "authorisationApiUrl",
      )}`.replace(domain, localOrigin);

      mockServer.use(
        http.get(ledgerApiUrl, () => HttpResponse.json({})),
        http.get(authorisationApiUrl, () => HttpResponse.json({})),
      );

      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      server = app.getHttpServer();
    });

    afterAll(async () => {
      await app.close();
    });

    describe("GET /", () => {
      it("should return 'ok'", async () => {
        expect.assertions(2);

        const response = await request(server).get("/");

        expect(response.text).toBe("ok");
        expect(response.status).toBe(200);
      });
    });

    describe("GET /unknown-route", () => {
      it("should return an error", async () => {
        expect.assertions(2);

        const response = await request(server).get("/unknown-route").send();

        expect(response.body).toStrictEqual({
          detail: "Cannot GET /unknown-route",
          status: 404,
          title: "Not Found",
          type: "about:blank",
        });
        expect(response.status).toBe(404);
      });

      it("should provide EBSI image version/tag in headers", async () => {
        expect.assertions(2);
        const response = await request(server).get("/heal").send();
        const headers = response.header as ResponseHeaders;
        expect(headers).toHaveProperty("ebsi-image-tag");
        expect(headers["ebsi-image-tag"]).toBe(dockerTag);
      });
    });

    describe("GET /health", () => {
      it("should provide EBSI image version/tag in headers", async () => {
        expect.assertions(2);

        const localOrigin =
          configService.get<string>("localOrigin") ||
          configService.get<string>("domain");

        // All the dependencies return a 200
        const dependencies = Object.keys(
          DEPENDENCIES,
        ) as (keyof typeof DEPENDENCIES)[];

        mockServer.use(
          ...dependencies.map((dependency) =>
            http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
              HttpResponse.json({}),
            ),
          ),
        );

        const response = await request(server).get("/health").send();
        const headers = response.header as ResponseHeaders;
        expect(headers).toHaveProperty("ebsi-image-tag");
        expect(headers["ebsi-image-tag"]).toBe(dockerTag);
      });
    });
  });

  it("should support a complete user journey", async () => {
    process.env.LOCAL_ORIGIN = "";

    // Spin up test blockchain (hardhat)
    const testEnv = await setupTestEnv();

    const { trackAndTraceContract } = testEnv;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => trackAndTraceContract.address,
    );

    // Mock TrackAndTrace contract
    vi.spyOn(TrackAndTrace__factory, "connect").mockImplementation(
      () => trackAndTraceContract,
    );

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
      app.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const domain = configService.get<string>("domain");
    const localOrigin = configService.get<string>("localOrigin") || domain;

    // Mock dependencies
    const ledgerApiUrl = configService
      .get<string>("ledgerApiUrl")
      .replace(domain, localOrigin);
    const authorisationApiUrl = `${configService.get<string>(
      "authorisationApiUrl",
    )}`.replace(domain, localOrigin);

    mockServer.use(
      http.get(ledgerApiUrl, () => HttpResponse.json({})),
      http.get(authorisationApiUrl, () => HttpResponse.json({})),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const server = app.getHttpServer();

    // Mock Contract service
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(trackAndTraceContract),
    );

    // Generate key pair for Authorisation API v4
    const authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    const authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    // Mock Auth API
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

    const createAccessToken = (sub: string, scp: string) => {
      return new SignJWT({ sub, scp })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid: authApiKid,
        })
        .sign(authApiKeyPair.privateKey);
    };

    // Prepare the different actors
    const authoriser = {
      did: EbsiWallet.createDid(),
      wallet: ethers.Wallet.createRandom(),
    } satisfies Actor;

    const documentCreator = {
      did: EbsiWallet.createDid(),
      wallet: ethers.Wallet.createRandom(),
    } satisfies Actor;

    const didEbsiEventsCreator = {
      did: EbsiWallet.createDid(),
      wallet: ethers.Wallet.createRandom(),
    } satisfies Actor;

    const didKeyEventsCreatorWallet = ethers.Wallet.createRandom();
    const didKeyEventsCreatorPublicKeyJwk = encode.publicKey.fromHexToJWK(
      didKeyEventsCreatorWallet.publicKey,
    );
    const didKeyEventsCreator = {
      did: util.createDid(didKeyEventsCreatorPublicKeyJwk),
      wallet: didKeyEventsCreatorWallet,
    } satisfies Actor;

    // Helper functions to avoid code repetition
    async function buildTransaction({
      method,
      params,
      accessToken,
    }: {
      method: string;
      params: unknown[];
      accessToken: string;
    }) {
      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
        .send({ jsonrpc: "2.0", method, params, id: 231 });

      return responseBuild;
    }

    async function signAndSendTransaction({
      unsignedTransaction,
      signer,
      accessToken,
    }: {
      unsignedTransaction: unknown;
      signer: ethers.Wallet;
      accessToken: string;
    }) {
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
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

      return responseSend;
    }

    // "authoriser" allows "documentCreator" to create documents

    // Pre-requisites: "authoriser" has obtained a VC from an allowlisted entity and can get an access token with "tnt_authorise" scope
    const authoriserAccessToken = await createAccessToken(
      authoriser.did,
      "openid tnt_authorise",
    );

    let responseBuild = await buildTransaction({
      method: "authoriseDid",
      params: [
        {
          from: authoriser.wallet.address,
          didEbsi: documentCreator.did,
          whiteList: true,
        } satisfies AuthoriseDidSchema,
      ],
      accessToken: authoriserAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    let responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: authoriser.wallet,
      accessToken: authoriserAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check if "documentCreator" is registered as a creator
    let response = await request(server).head(
      `/accesses?creator=${documentCreator.did}`,
    );

    expect(response.status).toBe(204);

    // "documentCreator" creates a new document
    const documentCreatorCreateAccessToken = await createAccessToken(
      documentCreator.did,
      "openid tnt_create",
    );

    const document1 = {
      hash: `0x${randomBytes(32).toString("hex")}`,
      metadata: "test metadata",
      creator: documentCreator.did,
      timestamp: {
        datetime: "",
        proof: "",
      },
    };

    responseBuild = await buildTransaction({
      method: "createDocument",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
          documentMetadata: document1.metadata,
          didEbsiCreator: document1.creator,
        } satisfies CreateDocumentSchema,
      ],
      accessToken: documentCreatorCreateAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: documentCreator.wallet,
      accessToken: documentCreatorCreateAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Get block containing the transaction
    let receipt = await hre.ethers.provider.getTransactionReceipt(
      responseSend.body.result as string,
    );
    let block = await hre.ethers.provider.getBlock(receipt.blockHash);

    // Extract datetime and proof from block
    document1.timestamp.datetime = `0x${block.timestamp.toString(16)}`;
    document1.timestamp.proof = `0x${block.number.toString(16).padStart(64, "0")}`;

    // Check document
    response = await request(server).get(`/documents/${document1.hash}`);

    expect(response.body).toStrictEqual({
      metadata: document1.metadata,
      timestamp: {
        source: "block",
        datetime: document1.timestamp.datetime,
        proof: document1.timestamp.proof,
      },
      events: [],
      creator: document1.creator,
    } satisfies Document);

    // "documentCreator" adds a new event to the document
    const documentCreatorWriteAccessToken = await createAccessToken(
      documentCreator.did,
      "openid tnt_write",
    );

    const document1Event1 = {
      externalHash: `0x${randomBytes(32).toString("hex")}`,
      sender: await didToHex(documentCreator.did),
      origin: "",
      metadata: "test event metadata",
      hash: "",
      timestamp: {
        datetime: "",
        proof: "",
      },
    };

    responseBuild = await buildTransaction({
      method: "writeEvent",
      params: [
        {
          from: documentCreator.wallet.address,
          eventParams: {
            documentHash: document1.hash,
            externalHash: document1Event1.externalHash,
            sender: document1Event1.sender,
            origin: document1Event1.origin,
            metadata: document1Event1.metadata,
          },
        } satisfies WriteEventSchema,
      ],
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: documentCreator.wallet,
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Get block containing the transaction
    receipt = await hre.ethers.provider.getTransactionReceipt(
      responseSend.body.result as string,
    );
    block = await hre.ethers.provider.getBlock(receipt.blockHash);

    // Extract datetime and proof from block
    document1Event1.timestamp.datetime = `0x${block.timestamp.toString(16)}`;
    document1Event1.timestamp.proof = `0x${block.number.toString(16).padStart(64, "0")}`;

    // Event hash is `keccak256(bytes(eventParams.externalHash))`
    document1Event1.hash = ethers.utils.keccak256(
      Buffer.from(document1Event1.externalHash, "utf-8"), // Note: externalHash is treated as an UTF-8 string
    );

    // Check document
    response = await request(server).get(`/documents/${document1.hash}`);

    expect(response.body).toStrictEqual({
      metadata: document1.metadata,
      timestamp: {
        source: "block",
        datetime: document1.timestamp.datetime,
        proof: document1.timestamp.proof,
      },
      events: [document1Event1.hash],
      creator: document1.creator,
    } satisfies Document);

    // Check event
    response = await request(server).get(
      `/documents/${document1.hash}/events/${document1Event1.hash}`,
    );

    expect(response.body).toStrictEqual({
      metadata: document1Event1.metadata,
      timestamp: {
        source: "block",
        datetime: document1Event1.timestamp.datetime,
        proof: document1Event1.timestamp.proof,
      },
      externalHash: document1Event1.externalHash,
      hash: document1Event1.hash,
      origin: document1Event1.origin,
      sender: document1Event1.sender,
    } satisfies Event);

    // "documentCreator" grants "write" permission to "didEbsiEventsCreator" for the document
    responseBuild = await buildTransaction({
      method: "grantAccess",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
          grantedByAccount: await didToHex(documentCreator.did),
          grantedByAccType: AccountType.DID_EBSI,
          subjectAccount: await didToHex(didEbsiEventsCreator.did),
          subjectAccType: AccountType.DID_EBSI,
          permission: Permission.WRITE,
        } satisfies GrantAccessSchema,
      ],
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: documentCreator.wallet,
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check access
    response = await request(server).get(
      `/documents/${document1.hash}/accesses`,
    );

    expect(response.body).toStrictEqual({
      self: expect.stringContaining(
        `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
      ),
      items: [
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "creator",
          subject: documentCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "write",
          subject: didEbsiEventsCreator.did,
        },
      ] satisfies DocumentAccesses,
      total: 2,
      pageSize: 10,
      links: {
        first: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        prev: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        next: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        last: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
      },
    });

    // "didEbsiEventsCreator" adds a new event (external timestamp) to the document
    const didEbsiEventsCreatorWriteAccessToken = await createAccessToken(
      didEbsiEventsCreator.did,
      "openid tnt_write",
    );

    const document1Event2 = {
      externalHash: `0x${randomBytes(32).toString("hex")}`,
      sender: await didToHex(didEbsiEventsCreator.did),
      origin: "",
      metadata: "test event metadata",
      hash: "",
      timestamp: {
        datetime: Math.floor(Date.now() / 1000),
        proof: `0x${randomBytes(32).toString("hex")}`,
      },
    };

    responseBuild = await buildTransaction({
      method: "writeEvent",
      params: [
        {
          from: didEbsiEventsCreator.wallet.address,
          eventParams: {
            documentHash: document1.hash,
            externalHash: document1Event2.externalHash,
            sender: document1Event2.sender,
            origin: document1Event2.origin,
            metadata: document1Event2.metadata,
          },
          timestamp: document1Event2.timestamp.datetime,
          timestampProof: document1Event2.timestamp.proof,
        } satisfies WriteEventSchema,
      ],
      accessToken: didEbsiEventsCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: didEbsiEventsCreator.wallet,
      accessToken: didEbsiEventsCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Event hash is `keccak256(bytes(eventParams.externalHash))`
    document1Event2.hash = ethers.utils.keccak256(
      Buffer.from(document1Event2.externalHash, "utf-8"), // Note: externalHash is treated as an UTF-8 string
    );

    // Check document
    response = await request(server).get(`/documents/${document1.hash}`);

    expect(response.body).toStrictEqual({
      metadata: document1.metadata,
      timestamp: {
        source: "block",
        datetime: document1.timestamp.datetime,
        proof: document1.timestamp.proof,
      },
      events: [document1Event1.hash, document1Event2.hash],
      creator: document1.creator,
    } satisfies Document);

    // Check event
    response = await request(server).get(
      `/documents/${document1.hash}/events/${document1Event2.hash}`,
    );

    expect(response.body).toStrictEqual({
      metadata: document1Event2.metadata,
      timestamp: {
        source: "external",
        datetime: `0x${document1Event2.timestamp.datetime.toString(16)}`,
        proof: document1Event2.timestamp.proof,
      },
      externalHash: document1Event2.externalHash,
      hash: document1Event2.hash,
      origin: document1Event2.origin,
      sender: document1Event2.sender,
    } satisfies Event);

    // "documentCreator" grants "delegate" permission to "didEbsiEventsCreator" for the document
    responseBuild = await buildTransaction({
      method: "grantAccess",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
          grantedByAccount: await didToHex(documentCreator.did),
          grantedByAccType: AccountType.DID_EBSI,
          subjectAccount: await didToHex(didEbsiEventsCreator.did),
          subjectAccType: AccountType.DID_EBSI,
          permission: Permission.DELEGATE,
        } satisfies GrantAccessSchema,
      ],
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: documentCreator.wallet,
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check access
    response = await request(server).get(
      `/documents/${document1.hash}/accesses`,
    );

    expect(response.body).toStrictEqual({
      self: expect.stringContaining(
        `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
      ),
      items: [
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "creator",
          subject: documentCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "delegate",
          subject: didEbsiEventsCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "write",
          subject: didEbsiEventsCreator.did,
        },
      ] satisfies DocumentAccesses,
      total: 3,
      pageSize: 10,
      links: {
        first: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        prev: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        next: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        last: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
      },
    });

    // "didEbsiEventsCreator" grants "write" permission to "didKeyEventsCreator" for the document
    responseBuild = await buildTransaction({
      method: "grantAccess",
      params: [
        {
          from: didEbsiEventsCreator.wallet.address,
          documentHash: document1.hash,
          grantedByAccount: await didToHex(didEbsiEventsCreator.did),
          grantedByAccType: AccountType.DID_EBSI,
          subjectAccount: await didToHex(didKeyEventsCreator.did),
          subjectAccType: AccountType.DID_KEY,
          permission: Permission.WRITE,
        } satisfies GrantAccessSchema,
      ],
      accessToken: didEbsiEventsCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: didEbsiEventsCreator.wallet,
      accessToken: didEbsiEventsCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check access
    response = await request(server).get(
      `/documents/${document1.hash}/accesses`,
    );

    expect(response.body).toStrictEqual({
      self: expect.stringContaining(
        `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
      ),
      items: [
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "creator",
          subject: documentCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "delegate",
          subject: didEbsiEventsCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "write",
          subject: didEbsiEventsCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: didEbsiEventsCreator.did,
          permission: "write",
          subject: didKeyEventsCreator.did,
        },
      ] satisfies DocumentAccesses,
      total: 4,
      pageSize: 10,
      links: {
        first: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        prev: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        next: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        last: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
      },
    });

    // "didKeyEventsCreator" adds a new event (external timestamp) to the document
    const didKeyEventsCreatorWriteAccessToken = await createAccessToken(
      didKeyEventsCreator.did,
      "openid tnt_write",
    );

    const document1Event3 = {
      externalHash: `0x${randomBytes(32).toString("hex")}`,
      sender: await didToHex(didKeyEventsCreator.did),
      origin: "",
      metadata: "test event metadata",
      hash: "",
      timestamp: {
        datetime: Math.floor(Date.now() / 1000),
        proof: `0x${randomBytes(32).toString("hex")}`,
      },
    };

    responseBuild = await buildTransaction({
      method: "writeEvent",
      params: [
        {
          from: didKeyEventsCreator.wallet.address,
          eventParams: {
            documentHash: document1.hash,
            externalHash: document1Event3.externalHash,
            sender: document1Event3.sender,
            origin: document1Event3.origin,
            metadata: document1Event3.metadata,
          },
          timestamp: document1Event3.timestamp.datetime,
          timestampProof: document1Event3.timestamp.proof,
        } satisfies WriteEventSchema,
      ],
      accessToken: didKeyEventsCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: didKeyEventsCreator.wallet,
      accessToken: didKeyEventsCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Event hash is `keccak256(bytes(eventParams.externalHash))`
    document1Event3.hash = ethers.utils.keccak256(
      Buffer.from(document1Event3.externalHash, "utf-8"), // Note: externalHash is treated as an UTF-8 string
    );

    // Check document
    response = await request(server).get(`/documents/${document1.hash}`);

    expect(response.body).toStrictEqual({
      metadata: document1.metadata,
      timestamp: {
        source: "block",
        datetime: document1.timestamp.datetime,
        proof: document1.timestamp.proof,
      },
      events: [
        document1Event1.hash,
        document1Event2.hash,
        document1Event3.hash,
      ],
      creator: document1.creator,
    } satisfies Document);

    // Check event
    response = await request(server).get(
      `/documents/${document1.hash}/events/${document1Event3.hash}`,
    );

    expect(response.body).toStrictEqual({
      metadata: document1Event3.metadata,
      timestamp: {
        source: "external",
        datetime: `0x${document1Event3.timestamp.datetime.toString(16)}`,
        proof: document1Event3.timestamp.proof,
      },
      externalHash: document1Event3.externalHash,
      hash: document1Event3.hash,
      origin: document1Event3.origin,
      sender: document1Event3.sender,
    } satisfies Event);

    // "didEbsiEventsCreator" revokes "write" permission to "didKeyEventsCreator" for the document
    responseBuild = await buildTransaction({
      method: "revokeAccess",
      params: [
        {
          from: didEbsiEventsCreator.wallet.address,
          documentHash: document1.hash,
          revokedByAccount: await didToHex(didEbsiEventsCreator.did),
          subjectAccount: await didToHex(didKeyEventsCreator.did),
          permission: Permission.WRITE,
        } satisfies RevokeAccessSchema,
      ],
      accessToken: didEbsiEventsCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: didEbsiEventsCreator.wallet,
      accessToken: didEbsiEventsCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check access
    response = await request(server).get(
      `/documents/${document1.hash}/accesses`,
    );

    expect(response.body).toStrictEqual({
      self: expect.stringContaining(
        `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
      ),
      items: [
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "creator",
          subject: documentCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "delegate",
          subject: didEbsiEventsCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "write",
          subject: didEbsiEventsCreator.did,
        },
      ] satisfies DocumentAccesses,
      total: 3,
      pageSize: 10,
      links: {
        first: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        prev: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        next: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        last: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
      },
    });

    // "documentCreator" revokes "delegate" permission to "didEbsiEventsCreator" for the document
    responseBuild = await buildTransaction({
      method: "revokeAccess",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
          revokedByAccount: await didToHex(documentCreator.did),
          subjectAccount: await didToHex(didEbsiEventsCreator.did),
          permission: Permission.DELEGATE,
        } satisfies RevokeAccessSchema,
      ],
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: documentCreator.wallet,
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check access
    response = await request(server).get(
      `/documents/${document1.hash}/accesses`,
    );

    expect(response.body).toStrictEqual({
      self: expect.stringContaining(
        `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
      ),
      items: [
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "creator",
          subject: documentCreator.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.did,
          permission: "write",
          subject: didEbsiEventsCreator.did,
        },
      ] satisfies DocumentAccesses,
      total: 2,
      pageSize: 10,
      links: {
        first: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        prev: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        next: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
        last: expect.stringContaining(
          `/documents/${document1.hash}/accesses?page[after]=1&page[size]=10`,
        ),
      },
    });

    // "documentCreator" removes document1
    responseBuild = await buildTransaction({
      method: "removeDocument",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
        } satisfies RemoveDocumentSchema,
      ],
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: documentCreator.wallet,
      accessToken: documentCreatorWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Check document
    response = await request(server).get(`/documents/${document1.hash}`);

    expect(response.body).toStrictEqual({
      detail: `Document ${document1.hash} not found`,
      status: 404,
      title: "Document Not Found",
      type: "about:blank",
    });

    // End of the test, close server
    await app.close();
  });
});
