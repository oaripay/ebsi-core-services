import request from "supertest";
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
import { AdministratorsModule } from "./administrators.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar } from "../../contracts/Tar";
import { Tar__factory } from "../../contracts/factories/Tar__factory";
import { mockedTarContract, jsonlds } from "../../../tests/mocks/tarContract";

jest.setTimeout(20000);

jest
  .spyOn(Tar__factory, "connect")
  .mockImplementation(mockedTarContract as jest.Mock<Tar>);

describe("Administrators Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdministratorsModule],
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
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /administrators", () => {
    it("should return a paginated collection of administrators", async () => {
      expect.assertions(3);

      const response = await request(server).get("/administrators");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 20,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        "/administrators?page[size]=3"
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=7&page[size]=3"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/administrators?page[after]=2&page[size]=3"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=3&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=7&page[size]=3"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/administrators?page[after]=100&page[size]=3"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=7&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=7&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=7&page[size]=3"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        "/administrators?page[after]=1"
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/administrators") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 20,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/administrators?page[size]=100"
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        "/administrators?page[size]=0"
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        "/administrators?page[after]=0"
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/administrators?page[after]=abc"
      );
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

      const response = await request(server).get(
        "/administrators/did:ebsi:0x00"
      );
      const data = Buffer.from(JSON.stringify(jsonlds[0]));
      const dataBase64 = data.toString("base64");
      const dataHash = ethers.utils.sha256(data);

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

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/administrators/no-administrator"
      );

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: "Administrator no-administrator not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
