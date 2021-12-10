import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { Session } from "@cef-ebsi/siop-auth";
import { createJWT, ES256KSigner } from "did-jwt";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { AdministratorsModule } from "./administrators.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { AttributeObject } from "./administrators.interface";
import { Tir } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/tir";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { ApiConfig } from "../../config/configuration";
import { LedgerService } from "../../shared/services/ledger.service";

jest.setTimeout(90000);

const ADMINISTRATORS_TOTAL = 3;

describe("Administrators Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let configService: ConfigService<ApiConfig>;
  let admin0AccessToken: string;
  let admin0AccessTokenPayload: { [x: string]: unknown };
  let tirContract: Tir;
  let ledgerService: LedgerService;
  const randomDid = EbsiWallet.createDid();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: ADMINISTRATORS_TOTAL,
    });
    tirContract = testEnv.tirContract;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdministratorsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    // Generate JWTs
    admin0AccessTokenPayload = { sub: testEnv.administrators[0].did };
    admin0AccessToken = await createJWT(admin0AccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
    });
  });

  beforeEach(() => {
    // Mock TIR contract
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(tirContract));

    // Mock access token verification
    jest
      .spyOn(Session.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.resolve(admin0AccessTokenPayload)
      );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /administrators", () => {
    it("should reject a GET without JWT", async () => {
      expect.assertions(3);

      const response = await request(server).get("/administrators");

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

    it("should reject a GET with an invalid token", async () => {
      expect.assertions(4);

      const verifyAccessTokenSpy = jest
        .spyOn(Session.prototype, "verifyAccessToken")
        .mockImplementation(async () =>
          Promise.reject(new Error("error message"))
        );

      const response = await request(server)
        .get("/administrators")
        .auth("jwt", { type: "bearer" });

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
        "jwt",
        configService.get("authorisationApiDid")
      );
    });

    it("should return a paginated collection of administrators", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get("/administrators")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server)
        .get("/administrators?page[size]=2")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server)
        .get("/administrators?page[after]=2&page[size]=2")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server)
        .get("/administrators?page[after]=100&page[size]=2")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response3.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server)
        .get("/administrators?page[after]=1")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server)
        .get("/administrators?page[size]=100")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server)
        .get("/administrators?page[size]=0")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server)
        .get("/administrators?page[after]=0")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server)
        .get("/administrators?page[after]=abc")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /administrators/{did}", () => {
    it("should return a specific administrator", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did;

      const response = await request(server)
        .get(`/administrators/${adminDid}`)
        .auth(admin0AccessToken, { type: "bearer" });

      const data = Buffer.from(JSON.stringify(administrators[0].attribute));
      const dataBase64 = data.toString("base64");
      const dataHash = ethers.utils.sha256(data);

      expect(response.body).toStrictEqual({
        did: adminDid,
        attributes: [
          {
            body: dataBase64,
            hash: dataHash.slice(2),
          },
        ],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/not-a-did")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/did:ebsi:z1234")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes", () => {
    it("should return the attributes of a specific administrator", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did;
      const url = `/administrators/${adminDid}/attributes`;
      const response = await request(server)
        .get(url)
        .auth(admin0AccessToken, { type: "bearer" });

      const data = Buffer.from(JSON.stringify(administrators[0].attribute));
      const dataHash = ethers.utils.sha256(data).slice(2);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(url) as string,
        items: [
          {
            href: expect.stringContaining(`${url}/${dataHash}`) as string,
            id: dataHash,
          },
        ],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/not-a-did/attributes")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/did:ebsi:z1234/attributes")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}/attributes`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes/{attributeId}", () => {
    let adminDid: string;
    let dataBase64: string;
    let dataHash: string;

    beforeAll(() => {
      const { administrators } = testEnv;
      adminDid = administrators[0].did;
      const data = Buffer.from(JSON.stringify(administrators[0].attribute));
      dataBase64 = data.toString("base64");
      dataHash = ethers.utils.sha256(data).slice(2);
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const url = `/administrators/${adminDid}/attributes/${dataHash}`;

      const response = await request(server)
        .get(url)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        did: adminDid,
        attribute: {
          body: dataBase64,
          hash: dataHash,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/not-a-did/attributes/${dataHash}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/did:ebsi:z1234/attributes/${dataHash}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}/attributes/${dataHash}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when the attribute is not found", async () => {
      expect.assertions(4);

      const { administrators } = testEnv;
      const url = `/administrators/${adminDid}/attributes`;

      // Consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response1 = await request(server)
        .get(`${url}/${attributeId}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a different did
      const data2 = Buffer.from(JSON.stringify(administrators[1].attribute));
      const attributeId4 = ethers.utils.sha256(data2);
      const response2 = await request(server)
        .get(`${url}/${attributeId4}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId4} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  // TODO: for better tests, add more attributes revisions (currently: 1)
  describe("GET /administrators/{did}/attributes/{attributeId}/revisions", () => {
    let adminDid: string;
    let dataHash: string;

    beforeAll(() => {
      const { administrators } = testEnv;
      adminDid = administrators[0].did;
      const data = Buffer.from(JSON.stringify(administrators[0].attribute));
      dataHash = ethers.utils.sha256(data).slice(2);
    });

    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

      const url = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

      const response = await request(server)
        .get(url)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `${url}?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(6);

      const url = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

      const response1 = await request(server)
        .get(`${url}?page[size]=3`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(url) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(1);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server)
        .get(`${url}?page[after]=2&page[size]=3`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(url) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/not-a-did/attributes/${dataHash}/revisions`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/did:ebsi:z1234/attributes/${dataHash}/revisions`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}/attributes/${dataHash}/revisions`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the attribute is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${adminDid}/attributes/wrong-hash/revisions`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        detail: "Attribute wrong-hash not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw Bad Request for bad pagination parameters", async () => {
      expect.assertions(4);

      const url = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

      const response1 = await request(server)
        .get(`${url}?page[size]=100`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server)
        .get(`${url}?page[size]=0`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
    });
  });
});
