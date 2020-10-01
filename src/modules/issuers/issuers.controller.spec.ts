import request from "supertest";
import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { FastifyInstance } from "fastify";
import IssuersModule from "./issuers.module";
import AllExceptionsFilter from "../../filters/http-exception.filter";
import mockTirContract from "../../../tests/mockTirContract";
import { ledgerWorking } from "../../../tests/mockAxios";

jest.setTimeout(20000);
jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("appController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IssuersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`get /issuers`, async () => {
    expect.assertions(3);
    const response = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers"
    );
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

  it(`get /issuers different pagination`, async () => {
    expect.assertions(12);
    const response1 = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers?page[size]=3"
    );
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
    const response2 = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers?page[after]=1&page[size]=3"
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
    const response3 = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers?page[after]=100&page[size]=3"
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
    const response4 = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers?page[after]=1"
    );
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

  it(`throws bad request for bad pagination in get /issuers`, async () => {
    expect.assertions(4);
    const response1 = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers?page[size]=100"
    );
    expect(response1.body).toStrictEqual({
      title: "Bad Paging Request",
      status: 400,
      detail: "PageSize should not be greater than 50",
      type: "about:blank",
    });
    expect(response1.status).toBe(400);

    const response2 = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/issuers?page[size]=0"
    );
    expect(response2.body).toStrictEqual({
      title: "Bad Paging Request",
      status: 400,
      detail: "PageSize should be greater than 0",
      type: "about:blank",
    });
    expect(response1.status).toBe(400);
  });

  it(`gets a specific issuer`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/v2/issuers/did:ebsi:0x00`
    );

    expect(response.body).toStrictEqual({
      did: "did:ebsi:0x00",
      attributes: [{ name: "alice" }],
    });
    expect(response.status).toBe(200);
  });

  it(`throws error for issuer not found`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/v2/issuers/no-issuer`
    );

    expect(response.body).toStrictEqual({
      title: "Issuer Not Found",
      status: 404,
      detail: "Issuer no-issuer not found",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });
});
