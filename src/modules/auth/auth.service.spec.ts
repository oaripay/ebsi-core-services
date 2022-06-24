import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import type { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { bases } from "multiformats/basics";
import { generateKeyPair, importJWK, JWK, SignJWT, KeyLike } from "jose";
import axios from "axios";
import * as authModule from "./auth.module";
import { ApiConfig } from "../../config/configuration";
import AuthService from "./auth.service";

describe("auth module tests", () => {
  let app: INestApplication;
  let configService: ConfigService<ApiConfig>;
  let eos: {
    privateKey: Uint8Array | KeyLike;
    publicKeyJwk: JWK;
    did: string;
    kid: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [authModule.default],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    const privateKeyHex = configService.get<string>("apiPrivateKey");
    const publicKeyJwk = new EbsiWallet(privateKeyHex).getPublicKey({
      format: "jwk",
    }) as JWK;
    const privateKeyJwk = {
      ...publicKeyJwk,
      d: bases.base64url.baseEncode(Buffer.from(privateKeyHex, "hex")),
    };
    const kid = configService.get<string>("apiVerificationMethodKid");
    eos = {
      privateKey: await importJWK(privateKeyJwk, "ES256K"),
      publicKeyJwk,
      did: kid.split("#")[0],
      kid,
    };

    jest.spyOn(axios, "get").mockImplementation((url: string) => {
      if (
        url.includes(
          `${configService.get<string>("didRegistryApiUrl")}/${eos.did}`
        )
      ) {
        return Promise.resolve({
          data: {
            "@context": [
              "https://www.w3.org/ns/did/v1",
              "https://w3id.org/security/suites/jws-2020/v1",
            ],
            id: eos.did,
            verificationMethod: [
              {
                id: eos.kid,
                type: "JsonWebKey2020",
                controller: eos.did,
                publicKeyJwk: eos.publicKeyJwk,
              },
            ],
            authentication: [eos.kid],
            assertionMethod: [eos.kid],
          },
          status: 200,
        });
      }

      throw new Error(`Unmocked Axios request: ${url}`);
    });
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  it("should validate a token", async () => {
    const payloadCaptcha = {
      onboarding: "recaptcha",
      validatedInfo: {
        success: true,
        challenge_ts: "2021-05-12T14:14:20Z",
        score: 0.9,
        action: "login",
      },
    };

    const token = await new SignJWT(payloadCaptcha)
      .setProtectedHeader({
        alg: "ES256K",
        typ: "JWT",
        kid: eos.kid,
      })
      .setIssuer(eos.did)
      .sign(eos.privateKey);

    const authService: AuthService = new AuthService(configService);
    await expect(authService.validateToken(token)).resolves.not.toThrow();
  });

  it("should throw an error if the token to validate is wrong", async () => {
    expect.assertions(2);
    const authService: AuthService = new AuthService(configService);
    let token = await new SignJWT({})
      .setProtectedHeader({
        alg: "ES256K",
        typ: "JWT",
        kid: eos.kid,
      })
      .setIssuer(EbsiWallet.createDid())
      .sign(eos.privateKey);
    await expect(authService.validateToken(token)).rejects.toThrow(
      "Unexpected issuer found in session token"
    );

    token = await new SignJWT({})
      .setProtectedHeader({
        alg: "ES256K",
        typ: "JWT",
        kid: eos.kid,
      })
      .setIssuer(eos.did)
      .sign((await generateKeyPair("ES256K")).privateKey);
    await expect(authService.validateToken(token)).rejects.toThrow(
      "Unauthorized"
    );
  });
});
