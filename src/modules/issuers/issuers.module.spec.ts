import request from "supertest";
import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
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
import IssuersModule from "./issuers.module";
import { AttributeObject } from "./types/issuers.interface";
import AllExceptionsFilter from "../../filters/http-exception.filter";
import {
  mockTirContract,
  jsonlds,
  dummyData,
} from "../../../tests/utils/mockTirContract";
import { ledgerWorking } from "../../../tests/utils/mockAxios";

jest.setTimeout(20000);
jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("Issuers Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IssuersModule],
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
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  it("Get /issuers", async () => {
    expect.assertions(3);

    const response = await request(server).get("/issuers");
    expect(response.body).toStrictEqual({
      self: expect.stringContaining(
        `/trusted-issuers-registry/v2/issuers`
      ) as string,
      items: expect.arrayContaining([]) as Array<string>,
      total: 20,
      pageSize: 10,
      links: {
        first: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=10`,
        prev: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=10`,
        next: `/trusted-issuers-registry/v2/issuers?page[after]=1&page[size]=10`,
        last: `/trusted-issuers-registry/v2/issuers?page[after]=1&page[size]=10`,
      },
    });
    expect((response.body as { items: string }).items).toHaveLength(10);
    expect(response.status).toBe(200);
  });

  it("Get /issuers different pagination", async () => {
    expect.assertions(12);

    const response1 = await request(server).get("/issuers?page[size]=3");
    expect(response1.body).toStrictEqual({
      self: expect.stringContaining(
        `/trusted-issuers-registry/v2/issuers`
      ) as string,
      items: expect.arrayContaining([]) as Array<string>,
      total: 20,
      pageSize: 3,
      links: {
        first: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=3`,
        prev: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=3`,
        next: `/trusted-issuers-registry/v2/issuers?page[after]=1&page[size]=3`,
        last: `/trusted-issuers-registry/v2/issuers?page[after]=6&page[size]=3`,
      },
    });
    expect((response1.body as { items: string }).items).toHaveLength(3);
    expect(response1.status).toBe(200);

    // next page
    const response2 = await request(server).get(
      "/issuers?page[after]=1&page[size]=3"
    );
    expect(response2.body).toStrictEqual({
      self: expect.stringContaining(
        `/trusted-issuers-registry/v2/issuers`
      ) as string,
      items: expect.arrayContaining([]) as Array<string>,
      total: 20,
      pageSize: 3,
      links: {
        first: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=3`,
        prev: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=3`,
        next: `/trusted-issuers-registry/v2/issuers?page[after]=2&page[size]=3`,
        last: `/trusted-issuers-registry/v2/issuers?page[after]=6&page[size]=3`,
      },
    });
    expect((response2.body as { items: string }).items).toHaveLength(3);
    expect(response2.status).toBe(200);

    // big page
    const response3 = await request(server).get(
      "/issuers?page[after]=100&page[size]=3"
    );
    expect(response3.body).toStrictEqual({
      self: expect.stringContaining(
        `/trusted-issuers-registry/v2/issuers`
      ) as string,
      items: expect.arrayContaining([]) as Array<string>,
      total: 20,
      pageSize: 3,
      links: {
        first: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=3`,
        prev: `/trusted-issuers-registry/v2/issuers?page[after]=5&page[size]=3`,
        next: `/trusted-issuers-registry/v2/issuers?page[after]=6&page[size]=3`,
        last: `/trusted-issuers-registry/v2/issuers?page[after]=6&page[size]=3`,
      },
    });
    expect((response3.body as { items: string }).items).toHaveLength(2);
    expect(response3.status).toBe(200);

    // page after defined but page size undefined
    const response4 = await request(server).get("/issuers?page[after]=1");
    expect(response4.body).toStrictEqual({
      self: expect.stringContaining(
        `/trusted-issuers-registry/v2/issuers`
      ) as string,
      items: expect.arrayContaining([]) as Array<string>,
      total: 20,
      pageSize: 10,
      links: {
        first: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=10`,
        prev: `/trusted-issuers-registry/v2/issuers?page[after]=0&page[size]=10`,
        next: `/trusted-issuers-registry/v2/issuers?page[after]=1&page[size]=10`,
        last: `/trusted-issuers-registry/v2/issuers?page[after]=1&page[size]=10`,
      },
    });
    expect((response4.body as { items: string }).items).toHaveLength(10);
    expect(response4.status).toBe(200);
  });

  it("Throws bad request for bad pagination in get /issuers", async () => {
    expect.assertions(4);

    const response1 = await request(server).get("/issuers?page[size]=100");
    expect(response1.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: '["PageSize must be between 1 and 50"]',
      type: "about:blank",
    });
    expect(response1.status).toBe(400);

    const response2 = await request(server).get("/issuers?page[size]=0");
    expect(response2.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: '["PageSize must be between 1 and 50"]',
      type: "about:blank",
    });
    expect(response2.status).toBe(400);
  });

  it("Gets a specific issuer", async () => {
    expect.assertions(2);

    const response = await request(server).get("/issuers/did:ebsi:0x00");
    const data = Buffer.from(JSON.stringify(jsonlds[0]));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.keccak256(data);

    expect(response.body).toStrictEqual({
      did: "did:ebsi:0x00",
      attributes: [
        {
          body: dataBase64,
          hash: dataHash.slice(2),
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("Throws error for issuer not found", async () => {
    expect.assertions(2);

    const response = await request(server).get("/issuers/no-issuer");

    expect(response.body).toStrictEqual({
      title: "Issuer Not Found",
      status: 404,
      detail: "Issuer no-issuer not found",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });

  it("Gets attributes from a specific issuer", async () => {
    expect.assertions(2);

    const response = await request(server).get(
      "/issuers/did:ebsi:0x00/attributes"
    );
    const data = Buffer.from(JSON.stringify(jsonlds[0]));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.keccak256(data);

    expect(response.body).toStrictEqual([
      {
        body: dataBase64,
        hash: dataHash.slice(2),
      },
    ]);
    expect(response.status).toBe(200);
  });

  it("Gets a specific attribute", async () => {
    expect.assertions(2);

    const data = Buffer.from(JSON.stringify(jsonlds[1]));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.keccak256(data);
    const response = await request(server).get(
      `/issuers/did:ebsi:0x01/attributes/${dataHash}`
    );
    expect(response.body).toStrictEqual({
      did: "did:ebsi:0x01",
      attribute: {
        body: dataBase64,
        hash: dataHash.slice(2),
      },
    });
    expect(response.status).toBe(200);
  });

  it("Throws error when attribute is not found", async () => {
    expect.assertions(6);

    // Consult a random attribute
    const attributeId =
      "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
    const response1 = await request(server).get(
      `/issuers/did:ebsi:0x01/attributes/${attributeId}`
    );

    expect(response1.body).toStrictEqual({
      detail: expect.stringContaining(
        `Attribute ${attributeId} not found`
      ) as string,
      status: 404,
      title: "Attribute Not Found",
      type: "about:blank",
    });
    expect(response1.status).toBe(404);

    // Consult an attribute from a random did
    const response2 = await request(server).get(
      `/issuers/did:ebsi:unknown/attributes/${attributeId}`
    );

    expect(response2.body).toStrictEqual({
      detail: expect.stringContaining(
        `Issuer did:ebsi:unknown not found`
      ) as string,
      status: 404,
      title: "Issuer Not Found",
      type: "about:blank",
    });
    expect(response2.status).toBe(404);

    // Consult an attribute from a different did
    const data = Buffer.from(JSON.stringify(jsonlds[4]));
    const attributeId4 = ethers.utils.keccak256(data);
    const response3 = await request(server).get(
      `/issuers/did:ebsi:0x02/attributes/${attributeId4}`
    );

    expect(response3.body).toStrictEqual({
      detail: expect.stringContaining(
        `Attribute ${attributeId4} not found`
      ) as string,
      status: 404,
      title: "Attribute Not Found",
      type: "about:blank",
    });
    expect(response3.status).toBe(404);
  });

  it("Get revisions", async () => {
    expect.assertions(3);

    const did = "did:ebsi:0x12";
    const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
    const dataHash = ethers.utils.keccak256(data);
    const urlPath = `/trusted-issuers-registry/v2/issuers/${did}/attributes/${dataHash}/revisions`;

    const response = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions`
    );
    expect(response.body).toStrictEqual({
      self: expect.stringContaining(urlPath) as string,
      items: expect.arrayContaining([]) as AttributeObject[],
      total: 20,
      pageSize: 10,
      links: {
        first: `${urlPath}?page[after]=0&page[size]=10`,
        prev: `${urlPath}?page[after]=0&page[size]=10`,
        next: `${urlPath}?page[after]=1&page[size]=10`,
        last: `${urlPath}?page[after]=1&page[size]=10`,
      },
    });
    expect((response.body as { items: string }).items).toHaveLength(10);
    expect(response.status).toBe(200);
  });

  it("Get revisions different pagination", async () => {
    expect.assertions(12);

    const did = "did:ebsi:0x12";
    const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
    const dataHash = ethers.utils.keccak256(data);
    const urlPath = `/trusted-issuers-registry/v2/issuers/${did}/attributes/${dataHash}/revisions`;

    const response1 = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions?page[size]=3`
    );
    expect(response1.body).toStrictEqual({
      self: expect.stringContaining(urlPath) as string,
      items: expect.arrayContaining([]) as AttributeObject[],
      total: 20,
      pageSize: 3,
      links: {
        first: `${urlPath}?page[after]=0&page[size]=3`,
        prev: `${urlPath}?page[after]=0&page[size]=3`,
        next: `${urlPath}?page[after]=1&page[size]=3`,
        last: `${urlPath}?page[after]=6&page[size]=3`,
      },
    });
    expect((response1.body as { items: string }).items).toHaveLength(3);
    expect(response1.status).toBe(200);

    // next page
    const response2 = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions?page[after]=1&page[size]=3`
    );
    expect(response2.body).toStrictEqual({
      self: expect.stringContaining(urlPath) as string,
      items: expect.arrayContaining([]) as AttributeObject[],
      total: 20,
      pageSize: 3,
      links: {
        first: `${urlPath}?page[after]=0&page[size]=3`,
        prev: `${urlPath}?page[after]=0&page[size]=3`,
        next: `${urlPath}?page[after]=2&page[size]=3`,
        last: `${urlPath}?page[after]=6&page[size]=3`,
      },
    });
    expect((response2.body as { items: string }).items).toHaveLength(3);
    expect(response2.status).toBe(200);

    // big page
    const response3 = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions?page[after]=100&page[size]=3`
    );
    expect(response3.body).toStrictEqual({
      self: expect.stringContaining(urlPath) as string,
      items: expect.arrayContaining([]) as AttributeObject[],
      total: 20,
      pageSize: 3,
      links: {
        first: `${urlPath}?page[after]=0&page[size]=3`,
        prev: `${urlPath}?page[after]=5&page[size]=3`,
        next: `${urlPath}?page[after]=6&page[size]=3`,
        last: `${urlPath}?page[after]=6&page[size]=3`,
      },
    });
    expect((response3.body as { items: string }).items).toHaveLength(2);
    expect(response3.status).toBe(200);

    // page after defined but page size undefined
    const response4 = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions?page[after]=1`
    );
    expect(response4.body).toStrictEqual({
      self: expect.stringContaining(urlPath) as string,
      items: expect.arrayContaining([]) as AttributeObject[],
      total: 20,
      pageSize: 10,
      links: {
        first: `${urlPath}?page[after]=0&page[size]=10`,
        prev: `${urlPath}?page[after]=0&page[size]=10`,
        next: `${urlPath}?page[after]=1&page[size]=10`,
        last: `${urlPath}?page[after]=1&page[size]=10`,
      },
    });
    expect((response4.body as { items: string }).items).toHaveLength(10);
    expect(response4.status).toBe(200);
  });

  it("Throws bad request for bad pagination in get revisions", async () => {
    expect.assertions(4);

    const did = "did:ebsi:0x12";
    const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
    const dataHash = ethers.utils.keccak256(data);

    const response1 = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions?page[size]=100`
    );
    expect(response1.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: '["PageSize must be between 1 and 50"]',
      type: "about:blank",
    });
    expect(response1.status).toBe(400);

    const response2 = await request(server).get(
      `/issuers/${did}/attributes/${dataHash}/revisions?page[size]=0`
    );
    expect(response2.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: '["PageSize must be between 1 and 50"]',
      type: "about:blank",
    });
    expect(response2.status).toBe(400);
  });
});
