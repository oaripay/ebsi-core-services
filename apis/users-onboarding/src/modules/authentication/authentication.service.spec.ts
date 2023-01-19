import {
  jest,
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  afterEach,
} from "@jest/globals";
import crypto from "node:crypto";
import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { calculateJwkThumbprint, exportJWK, generateKeyPair, JWK } from "jose";
import * as jose from "jose";
import { createJWT, decodeJWT, ES256KSigner } from "did-jwt";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import type { EbsiVerifiableAttestation } from "@cef-ebsi/verifiable-credential";
import { Agent } from "@cef-ebsi/siop-auth";
import {
  EBSI_DID_METHOD_PREFIX,
  EBSI_DID_SPECS,
} from "@cef-ebsi/ebsi-did-resolver";
import { KEY_DID_METHOD_PREFIX } from "@cef-ebsi/key-did-resolver";
import { base64url } from "multiformats/bases/base64";
import { base58btc } from "multiformats/bases/base58";
import type { FastifyInstance } from "fastify";
import { Resolver } from "did-resolver";
import { AuthenticationModule } from "./authentication.module";
import { ApiConfig } from "../../config/configuration";
import AuthenticationService from "./authentication.service";
import {
  AuthenticationResponseRequest,
  AuthenticationRequest,
} from "../../shared/interfaces";

describe("authentication service tests", () => {
  let app: INestApplication;
  let configService: ConfigService<ApiConfig, true>;
  let authenticationService: AuthenticationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    authenticationService = new AuthenticationService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  it("should throw an error if the scope is not the required", async () => {
    expect.assertions(1);
    const mockedRequest: AuthenticationRequest = {
      scope: "wrong scope",
    };
    await expect(
      authenticationService.startAuthentication(mockedRequest)
    ).rejects.toThrow("Bad Request");
  });

  it("should save relying party data in memory", async () => {
    expect.assertions(1);
    const authService = new AuthenticationService(configService);

    const mockImportJwk = jest.spyOn(jose, "importJWK").mock;
    const mockedRequest: AuthenticationRequest = {
      scope: "ebsi users onboarding",
    };
    await authService.startAuthentication(mockedRequest);
    await authService.startAuthentication(mockedRequest);
    expect(mockImportJwk.calls).toHaveLength(1);
  });

  it("should prepare the did auth request and returns a session token", async () => {
    expect.assertions(5);

    const mockedRequest: AuthenticationRequest = {
      scope: "ebsi users onboarding",
    };

    const authenticationRequest =
      await authenticationService.startAuthentication(mockedRequest);

    const { searchParams } = new URL(authenticationRequest.session_token);

    expect(searchParams.get("response_type")).toBe("id_token");
    expect(searchParams.get("client_id")).toStrictEqual(
      expect.stringContaining("/users-onboarding/v2/authentication-responses")
    );
    expect(searchParams.get("scope")).toBe("openid did_authn");
    expect(searchParams.get("nonce")).toStrictEqual(expect.any(String));
    expect(searchParams.get("request")).toStrictEqual(expect.any(String));
  });

  it("should validate the response for legal entities", async () => {
    expect.assertions(1);
    const kid = "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ#key-1";
    const privateKey = crypto.randomBytes(32);
    const jwk = new EbsiWallet(privateKey).getPublicKey({
      format: "jwk",
    }) as JWK;
    const mockedAuthRequest: AuthenticationResponseRequest = {
      id_token: await createJWT(
        { sub_jwk: jwk },
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(privateKey),
        },
        {
          kid,
        }
      ),
    };

    jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue({
      didResolutionMetadata: {
        error: "notFound",
        message: "did not found",
      },
      didDocumentMetadata: {},
      didDocument: null,
    });

    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).resolves.not.toThrow();
  });

  it("should validate the response for natural persons (did:ebsi v2, legacy)", async () => {
    expect.assertions(1);
    const keyPair = await generateKeyPair("ES256K");
    const publicKeyJwkAgent = await exportJWK(keyPair.publicKey);
    const thumbprint = await calculateJwkThumbprint(
      publicKeyJwkAgent,
      "sha256"
    );
    const bytesArray = new Uint8Array(
      1 + EBSI_DID_SPECS.NATURAL_PERSON.BYTE_LENGTH
    );
    bytesArray.set([EBSI_DID_SPECS.NATURAL_PERSON.VERSION_ID]);
    bytesArray.set(base64url.baseDecode(thumbprint), 1);
    const methodSpecificIdentifier = base58btc.encode(bytesArray);
    const agentDid = `${EBSI_DID_METHOD_PREFIX}${methodSpecificIdentifier}`;
    const agentKid = `${agentDid}#${thumbprint}`;
    const agent = new Agent({
      privateKey: keyPair.privateKey,
      alg: "ES256K",
      kid: agentKid,
      siopV2: true,
    });
    const { idToken } = await agent.createResponse(
      {
        redirectUri: "/authentication-responses",
      },
      {
        syntaxType: "did_subject",
      }
    );

    await expect(
      authenticationService.validateResponse({ id_token: idToken })
    ).resolves.not.toThrow();
  });

  it("should validate the response for natural persons (did:key)", async () => {
    expect.assertions(1);
    const keyPair = await generateKeyPair("ES256K");
    const publicKeyJwkAgent = await exportJWK(keyPair.publicKey);
    const agentDid = EbsiWallet.createDid("NATURAL_PERSON", publicKeyJwkAgent);
    const fragmentIdentifier = agentDid.substring(KEY_DID_METHOD_PREFIX.length);
    const agentKid = `${agentDid}#${fragmentIdentifier}`;
    const agent = new Agent({
      privateKey: keyPair.privateKey,
      alg: "ES256K",
      kid: agentKid,
      siopV2: true,
    });
    const { idToken } = await agent.createResponse(
      {
        redirectUri: "/authentication-responses",
      },
      {
        syntaxType: "did_subject",
      }
    );

    await expect(
      authenticationService.validateResponse({ id_token: idToken })
    ).resolves.not.toThrow();
  });

  it("should throw an error if the id_token can not be decoded", async () => {
    expect.assertions(1);
    const mockedAuthRequest = {
      id_token: "badtoken",
    };
    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).rejects.toThrow("id_token could not be decoded");
  });

  it("should throw an error for invalid kid", async () => {
    expect.assertions(1);
    const privateKey = crypto.randomBytes(32);
    const jwk = new EbsiWallet(privateKey).getPublicKey({
      format: "jwk",
    }) as JWK;
    const mockedAuthRequest: AuthenticationResponseRequest = {
      id_token: await createJWT(
        { sub_jwk: jwk },
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(privateKey),
        }
      ),
    };

    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).rejects.toThrow(
      "id_token could not be decoded: kid not present in the headers"
    );
  });

  it("should throw an error if the validation of the response is not ok", async () => {
    expect.assertions(1);
    const kid = "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ#key-1";
    const privateKey = crypto.randomBytes(32);
    const mockedAuthRequest: AuthenticationResponseRequest = {
      id_token: await createJWT(
        {},
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(privateKey),
        },
        {
          kid,
        }
      ),
    };

    jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue({
      didResolutionMetadata: {
        error: "notFound",
        message: "did not found",
      },
      didDocumentMetadata: {},
      didDocument: null,
    });

    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).rejects.toThrow("sub_jwk missing in token payload");
  });

  it("should createVerifiableAuthorisation", async () => {
    expect.assertions(13);
    const did = "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ";
    const response = await authenticationService.createVerifiableAuthorisation(
      did
    );
    const decodedJwt = decodeJWT(response.verifiableCredential);
    const { vc } = decodedJwt.payload as { vc: EbsiVerifiableAttestation };

    expect(vc["@context"]).toStrictEqual([
      "https://www.w3.org/2018/credentials/v1",
    ]);
    expect(vc.id).toContain("vc:ebsi:authentication#");
    expect(vc.type).toStrictEqual([
      "VerifiableCredential",
      "VerifiableAuthorisation",
    ]);
    expect(vc.issuer).toBe(
      configService.get<string>("apiVerificationMethodKid").split("#")[0]
    );
    expect(vc.issuanceDate).toBeDefined();
    expect(vc.validFrom).toBeDefined();
    expect(vc.validFrom).toBe(vc.issuanceDate);
    expect(vc.expirationDate).toBeDefined();
    expect(vc.validFrom < vc.expirationDate).toBeTruthy();
    expect(vc.credentialSubject.id).toBe("did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ");
    expect(vc.credentialSchema).toBeDefined();
    expect(vc.credentialSchema).toHaveProperty("id");
    expect(vc.credentialSchema).toHaveProperty("type");
  });
});
