import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { Session } from "@cef-ebsi/siop-auth";
import { createJWT, ES256KSigner } from "@cef-ebsi/did-jwt";
import { AdministratorsModule } from "./administrators.module";
import { AttributeObject } from "./administrators.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/schemaRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { ContractService } from "../../shared/services/contract.service";
import { ApiConfig } from "../../config/configuration";

const ADMINISTRATORS_TOTAL = 3;

describe("Administrators Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let configService: ConfigService<ApiConfig>;
  let admin0AccessToken: string;
  let admin0AccessTokenPayload: { [x: string]: unknown };
  let contractService: ContractService;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: ADMINISTRATORS_TOTAL,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdministratorsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    contractService = moduleFixture.get<ContractService>(ContractService);

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    // Generate JWT
    admin0AccessTokenPayload = { sub: testEnv.administrators[0].did };
    admin0AccessToken = await createJWT(admin0AccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
    });
  });

  beforeEach(() => {
    // Mock TSR contract
    jest
      .spyOn(contractService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(testEnv.schemasRegistryContract)
      );

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
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
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
        self: expect.stringContaining(
          "/administrators?page[after]=1&page[size]=2"
        ) as string,
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
        self: expect.stringContaining(
          "/administrators?page[after]=2&page[size]=2"
        ) as string,
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
        self: expect.stringContaining(
          "/administrators?page[after]=100&page[size]=2"
        ) as string,
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

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server)
        .get("/administrators?page[after]=1")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response4.body).toStrictEqual({
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
      const adminDid = administrators[0].did.toLowerCase();
      const adminAttribute = administrators[0].attribute;

      const response = await request(server)
        .get(`/administrators/${adminDid}`)
        .auth(admin0AccessToken, { type: "bearer" });

      const data = Buffer.from(JSON.stringify(adminAttribute));
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

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/no-administrator")
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: "Administrator no-administrator not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes", () => {
    it("should return the attributes of a specific administrator", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();
      const adminAttribute = administrators[0].attribute;

      const response = await request(server)
        .get(`/administrators/${adminDid}/attributes`)
        .auth(admin0AccessToken, { type: "bearer" });

      const data = Buffer.from(JSON.stringify(adminAttribute));
      const dataHash = ethers.utils.sha256(data).slice(2);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/administrators/${adminDid}/attributes`
        ) as string,
        items: [
          {
            href: expect.stringContaining(
              `/administrators/${adminDid}/attributes/${dataHash}`
            ) as string,
            id: dataHash,
          },
        ],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /administrators/{did}/attributes/{attributeId}", () => {
    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();
      const adminAttribute = administrators[0].attribute;

      const data = Buffer.from(JSON.stringify(adminAttribute));

      const dataBase64 = data.toString("base64");
      const dataHash = ethers.utils.sha256(data);
      const response = await request(server)
        .get(`/administrators/${adminDid}/attributes/${dataHash}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        did: adminDid,
        attribute: {
          body: dataBase64,
          hash: dataHash.slice(2),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error when the attribute is not found", async () => {
      expect.assertions(6);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();

      // Consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response1 = await request(server)
        .get(`/administrators/${adminDid}/attributes/${attributeId}`)
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

      // Consult an existing attribute from a random did
      const attributeId2 = ethers.utils.sha256(
        Buffer.from(JSON.stringify(administrators[1].attribute))
      );
      const response2 = await request(server)
        .get(`/administrators/did:ebsi:unknown/attributes/${attributeId2}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          "Administrator did:ebsi:unknown not found"
        ) as string,
        status: 404,
        title: "Administrator Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);

      // Consult a valid attribute (of admin2Did) from a different did (adminDid)
      const attributeId3 = ethers.utils.sha256(
        Buffer.from(JSON.stringify(administrators[2].attribute))
      );
      const response3 = await request(server)
        .get(`/administrators/${adminDid}/attributes/${attributeId3}`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response3.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId3} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response3.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes/{attributeId}/revisions", () => {
    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();
      const adminAttribute = administrators[0].attribute;

      const data = Buffer.from(JSON.stringify(adminAttribute));

      const dataHash = ethers.utils.sha256(data);

      const urlPath = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

      const response = await request(server)
        .get(urlPath)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `${urlPath}?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();
      const adminAttribute = administrators[0].attribute;

      const data = Buffer.from(JSON.stringify(adminAttribute));

      const dataHash = ethers.utils.sha256(data);

      const urlPath = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

      const response1 = await request(server)
        .get(
          `/administrators/${adminDid}/attributes/${dataHash}/revisions?page[size]=3`
        )
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(urlPath) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(1);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server)
        .get(
          `/administrators/${adminDid}/attributes/${dataHash}/revisions?page[after]=2&page[size]=3`
        )
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(urlPath) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server)
        .get(
          `/administrators/${adminDid}/attributes/${dataHash}/revisions?page[after]=100&page[size]=3`
        )
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(urlPath) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server)
        .get(
          `/administrators/${adminDid}/attributes/${dataHash}/revisions?page[after]=1`
        )
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(urlPath) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(1);
      expect(response4.status).toBe(200);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminAttribute = administrators[0].attribute;

      const data = Buffer.from(JSON.stringify(adminAttribute));

      const dataHash = ethers.utils.sha256(data);

      const response = await request(server)
        .get(`/administrators/unknown-admin/attributes/${dataHash}/revisions`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: "Administrator unknown-admin not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the attribute is not found", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();

      const response = await request(server)
        .get(`/administrators/${adminDid}/attributes/wrong-hash/revisions`)
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        detail: "Attribute 0xwrong-hash not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw Bad Request for bad pagination parameters", async () => {
      expect.assertions(4);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did.toLowerCase();
      const adminAttribute = administrators[0].attribute;

      const data = Buffer.from(JSON.stringify(adminAttribute));

      const dataHash = ethers.utils.sha256(data);

      const response1 = await request(server)
        .get(
          `/administrators/${adminDid}/attributes/${dataHash}/revisions?page[size]=100`
        )
        .auth(admin0AccessToken, { type: "bearer" });

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server)
        .get(
          `/administrators/${adminDid}/attributes/${dataHash}/revisions?page[size]=0`
        )
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
