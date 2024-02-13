import { it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { util } from "@cef-ebsi/key-did-resolver";
import { waitToBeMined, encode } from "@ebsiint-api/shared";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import { getAccessToken } from "../utils/getAccessToken.js";
import type {
  AuthoriseDidSchema,
  CreateDocumentSchema,
  RemoveDocumentSchema,
  GrantAccessSchema,
  RevokeAccessSchema,
  UnsignedTransaction,
  WriteEventSchema,
} from "../../src/modules/jsonrpc/validators/index.js";
import { didToHex } from "../../src/shared/utils.js";
import { AccountType, Permission } from "../../src/shared/constants.js";
import type {
  Document,
  DocumentAccesses,
  Event,
} from "../../src/modules/documents/documents.interface.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface Actor {
  info: EbsiIssuer;
  wallet: ethers.Wallet;
}

describeWriteOps()("Track and Trace - User Journey (e2e)", () => {
  it("should support a complete user journey", async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const server = getServer(app, configService);

    const ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    // Prepare the different actors

    // Authoriser (existing user with a VC to onboard)
    const authoriserKid = configService.get("testAuthorisedLegalEntityKid", {
      infer: true,
    });

    if (!authoriserKid) {
      throw new Error("TEST_AUTHORISED_LEGAL_ENTITY_KID must be defined");
    }

    const authoriserDid = authoriserKid.split("#")[0] as string;
    const authoriserPrivateKeyHex = configService.get(
      "testAuthorisedLegalEntityPrivateKey",
      {
        infer: true,
      },
    );

    if (!authoriserPrivateKeyHex) {
      throw new Error(
        "TEST_AUTHORISED_LEGAL_ENTITY_PRIVATE_KEY must be defined",
      );
    }

    const authoriserPrivateKeyJwk = encode.privateKey.fromHexToJWK(
      authoriserPrivateKeyHex,
    );
    const { d, ...authoriserPublicKeyJwk } = authoriserPrivateKeyJwk;
    const vcOnboard = configService.get(
      "testAuthorisedLegalEntityVcToOnboard",
      {
        infer: true,
      },
    );

    if (!vcOnboard) {
      throw new Error(
        "TEST_AUTHORISED_LEGAL_ENTITY_VC_TO_ONBOARD must be defined",
      );
    }

    const authoriser = {
      wallet: new ethers.Wallet(authoriserPrivateKeyHex),
      info: {
        did: authoriserDid,
        kid: authoriserKid,
        privateKeyJwk: authoriserPrivateKeyJwk,
        publicKeyJwk: authoriserPublicKeyJwk,
        alg: "ES256K",
      },
    } satisfies Actor;

    // Document and events creator (did:ebsi, already registered in the DIDR)
    const documentCreatorKid = configService.get("testRegularLegalEntityKid", {
      infer: true,
    });

    if (!documentCreatorKid) {
      throw new Error("TEST_REGULAR_LEGAL_ENTITY_KID must be defined");
    }

    const documentCreatorDid = documentCreatorKid.split("#")[0] as string;
    const documentCreatorPrivateKeyHex = configService.get(
      "testRegularLegalEntityPrivateKey",
      { infer: true },
    );

    if (!documentCreatorPrivateKeyHex) {
      throw new Error("TEST_REGULAR_LEGAL_ENTITY_PRIVATE_KEY must be defined");
    }

    const documentCreatorPrivateKeyJwk = encode.privateKey.fromHexToJWK(
      documentCreatorPrivateKeyHex,
    );
    const { d: documentCreatorD, ...documentCreatorPublicKeyJwk } =
      documentCreatorPrivateKeyJwk;

    const documentCreator = {
      wallet: new ethers.Wallet(documentCreatorPrivateKeyHex),
      info: {
        did: documentCreatorDid,
        kid: documentCreatorKid,
        privateKeyJwk: documentCreatorPrivateKeyJwk,
        publicKeyJwk: documentCreatorPublicKeyJwk,
        alg: "ES256K",
      },
    } satisfies Actor;

    // Delegate (did:key)
    const didKeyDelegateWallet = ethers.Wallet.createRandom();
    const didKeyDelegatePrivateKeyJwk = encode.privateKey.fromHexToJWK(
      didKeyDelegateWallet.privateKey,
    );
    const didKeyDelegatePublicKeyJwk = encode.publicKey.fromHexToJWK(
      didKeyDelegateWallet.publicKey,
    );
    const didKeyDelegateDid = util.createDid(didKeyDelegatePublicKeyJwk);
    const didKeyDelegateFragmentIdentifier = didKeyDelegateDid.replace(
      "did:key:",
      "",
    );
    const didKeyDelegateKid = `${didKeyDelegateDid}#${didKeyDelegateFragmentIdentifier}`;

    const didKeyDelegate = {
      wallet: didKeyDelegateWallet,
      info: {
        did: didKeyDelegateDid,
        kid: didKeyDelegateKid,
        privateKeyJwk: didKeyDelegatePrivateKeyJwk,
        publicKeyJwk: didKeyDelegatePublicKeyJwk,
        alg: "ES256K",
      },
    } satisfies Actor;

    // Events creator (did:key)
    const didKeyEventsCreatorWallet = ethers.Wallet.createRandom();
    const didKeyEventsCreatorPrivateKeyJwk = encode.privateKey.fromHexToJWK(
      didKeyEventsCreatorWallet.privateKey,
    );
    const didKeyEventsCreatorPublicKeyJwk = encode.publicKey.fromHexToJWK(
      didKeyEventsCreatorWallet.publicKey,
    );
    const didKeyEventsCreatorDid = util.createDid(
      didKeyEventsCreatorPublicKeyJwk,
    );
    const didKeyEventsCreatorFragmentIdentifier =
      didKeyEventsCreatorDid.replace("did:key:", "");
    const didKeyEventsCreatorKid = `${didKeyEventsCreatorDid}#${didKeyEventsCreatorFragmentIdentifier}`;

    const didKeyEventsCreator = {
      wallet: didKeyEventsCreatorWallet,
      info: {
        did: didKeyEventsCreatorDid,
        kid: didKeyEventsCreatorKid,
        privateKeyJwk: didKeyEventsCreatorPrivateKeyJwk,
        publicKeyJwk: didKeyEventsCreatorPublicKeyJwk,
        alg: "ES256K",
      },
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
    const authoriserAccessToken = await getAccessToken(
      configService.get("authorisationApiUrl", { infer: true }),
      authoriser.info,
      "openid tnt_authorise",
      undefined,
      vcOnboard,
    );

    let responseBuild = await buildTransaction({
      method: "authoriseDid",
      params: [
        {
          from: authoriser.wallet.address,
          senderDid: authoriser.info.did,
          authorisedDid: documentCreator.info.did,
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

    // wait to be mined
    let receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

    // Check if "documentCreator" is registered as a creator
    let response = await request(server).head(
      `/accesses?creator=${documentCreator.info.did}`,
    );

    expect(response.status).toBe(204);

    // "documentCreator" creates a new document
    const documentCreatorCreateAccessToken = await getAccessToken(
      configService.get("authorisationApiUrl", { infer: true }),
      documentCreator.info,
      "openid tnt_create",
    );

    const document1 = {
      hash: `0x${randomBytes(32).toString("hex")}`,
      metadata: "test metadata",
      creator: documentCreator.info.did,
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

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

    // Get block containing the transaction
    const provider = new ethers.providers.JsonRpcProvider(ledgerApi);
    let block = await provider.getBlock(receipt.blockHash);

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
    const documentCreatorWriteAccessToken = await getAccessToken(
      configService.get("authorisationApiUrl", { infer: true }),
      documentCreator.info,
      "openid tnt_write",
    );

    const document1Event1 = {
      externalHash: `0x${randomBytes(32).toString("hex")}`,
      sender: await didToHex(documentCreator.info.did),
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

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

    // Get block containing the transaction
    block = await provider.getBlock(receipt.blockHash);

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

    // "documentCreator" grants "delegate" permission to "didKeyDelegate" for the document
    responseBuild = await buildTransaction({
      method: "grantAccess",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
          grantedByAccount: await didToHex(documentCreator.info.did),
          grantedByAccType: AccountType.DID_EBSI,
          subjectAccount: await didToHex(didKeyDelegate.info.did),
          subjectAccType: AccountType.DID_KEY,
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

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

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
          grantedBy: documentCreator.info.did,
          permission: "creator",
          subject: documentCreator.info.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.info.did,
          permission: "delegate",
          subject: didKeyDelegate.info.did,
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

    // "didKeyDelegate" grants "write" permission to "didKeyEventsCreator" for the document
    const didKeyDelegateWriteAccessToken = await getAccessToken(
      configService.get("authorisationApiUrl", { infer: true }),
      didKeyDelegate.info,
      "openid tnt_write",
    );

    responseBuild = await buildTransaction({
      method: "grantAccess",
      params: [
        {
          from: didKeyDelegate.wallet.address,
          documentHash: document1.hash,
          grantedByAccount: await didToHex(didKeyDelegate.info.did),
          grantedByAccType: AccountType.DID_KEY,
          subjectAccount: await didToHex(didKeyEventsCreator.info.did),
          subjectAccType: AccountType.DID_KEY,
          permission: Permission.WRITE,
        } satisfies GrantAccessSchema,
      ],
      accessToken: didKeyDelegateWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: didKeyDelegate.wallet,
      accessToken: didKeyDelegateWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

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
          grantedBy: documentCreator.info.did,
          permission: "creator",
          subject: documentCreator.info.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.info.did,
          permission: "delegate",
          subject: didKeyDelegate.info.did,
        },
        {
          documentId: document1.hash,
          grantedBy: didKeyDelegate.info.did,
          permission: "write",
          subject: didKeyEventsCreator.info.did,
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

    // "didKeyEventsCreator" adds a new event (external timestamp) to the document
    const didKeyEventsCreatorWriteAccessToken = await getAccessToken(
      configService.get("authorisationApiUrl", { infer: true }),
      didKeyEventsCreator.info,
      "openid tnt_write",
    );

    const document1Event2 = {
      externalHash: `0x${randomBytes(32).toString("hex")}`,
      sender: await didToHex(didKeyEventsCreator.info.did),
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
            externalHash: document1Event2.externalHash,
            sender: document1Event2.sender,
            origin: document1Event2.origin,
            metadata: document1Event2.metadata,
          },
          timestamp: document1Event2.timestamp.datetime,
          timestampProof: document1Event2.timestamp.proof,
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

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

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

    // "didKeyDelegate" revokes "write" permission to "didKeyEventsCreator" for the document
    responseBuild = await buildTransaction({
      method: "revokeAccess",
      params: [
        {
          from: didKeyDelegate.wallet.address,
          documentHash: document1.hash,
          revokedByAccount: await didToHex(didKeyDelegate.info.did),
          subjectAccount: await didToHex(didKeyEventsCreator.info.did),
          permission: Permission.WRITE,
        } satisfies RevokeAccessSchema,
      ],
      accessToken: didKeyDelegateWriteAccessToken,
    });

    expect(responseBuild.status).toBe(200);

    responseSend = await signAndSendTransaction({
      unsignedTransaction: responseBuild.body.result,
      signer: didKeyDelegate.wallet,
      accessToken: didKeyDelegateWriteAccessToken,
    });

    expect(responseSend.status).toBe(200);

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

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
          grantedBy: documentCreator.info.did,
          permission: "creator",
          subject: documentCreator.info.did,
        },
        {
          documentId: document1.hash,
          grantedBy: documentCreator.info.did,
          permission: "delegate",
          subject: didKeyDelegate.info.did,
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

    // "documentCreator" revokes "delegate" permission to "didKeyDelegate" for the document
    responseBuild = await buildTransaction({
      method: "revokeAccess",
      params: [
        {
          from: documentCreator.wallet.address,
          documentHash: document1.hash,
          revokedByAccount: await didToHex(documentCreator.info.did),
          subjectAccount: await didToHex(didKeyDelegate.info.did),
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

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

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
          grantedBy: documentCreator.info.did,
          permission: "creator",
          subject: documentCreator.info.did,
        },
      ] satisfies DocumentAccesses,
      total: 1,
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

    // Wait for tx to be included in a block
    receipt = await waitToBeMined(
      ledgerApi,
      responseSend.body.result as string,
    );
    expect(receipt.status).toBe(1);

    // Check document
    response = await request(server).get(`/documents/${document1.hash}`);

    expect(response.body).toStrictEqual({
      detail: `Document ${document1.hash} not found`,
      status: 404,
      title: "Document Not Found",
      type: "about:blank",
    });

    // Close server
    await app.close();
  });
});
