import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import {
  NestFastifyApplication,
  FastifyAdapter,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { INestApplication } from "@nestjs/common/interfaces/nest-application.interface";
import { ethers } from "ethers";
import { Logger } from "@nestjs/common/services/logger.service";
import mockNotaryContract from "../../../tests/mockNotaryContract";
import mockEthersProvider from "../../../tests/mockEthersProvider";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { HashResponseObject } from "./types/hashes.interface";
import { HashesModule } from "./hashes.module";

jest.setTimeout(20000);

describe("HashesController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.spyOn(ethers, "Contract").mockImplementation(mockNotaryContract);
    jest
      .spyOn(ethers.providers, "JsonRpcProvider")
      .mockImplementation(mockEthersProvider);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HashesModule],
    }).compile();
    Logger.overrideLogger(false);
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

  describe("hashes", () => {
    it("should return a paginated list of hashes", async () => {
      expect.assertions(3);
      const url = `/hashes`;
      const response = await request(app.getHttpServer()).get(url);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(url) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 10,
        pageSize: 10,
        links: {
          first: "undefined/hashes?page[after]=0&page[size]=10",
          last: "undefined/hashes?page[after]=10&page[size]=10",
          next: "undefined/hashes?page[after]=8570872&page[size]=10",
          prev: "undefined/hashes?page[after]=8570872&page[size]=10",
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });
  });

  describe("hash", () => {
    it("should retrieve a hash", async () => {
      expect.assertions(2);
      const hashResponseObject: HashResponseObject = {
        blockNumber: 646595,
        hash:
          "9d835ec5cc060cbef177a45ec9219e2831c11048aaf130e5f6690619f0f5200a",
        registeredBy: "0x0ef9c28263fd26be9d597925be02085bb1236b59",
        timestamp: new Date(1586171386 * 1000).toISOString(),
        txHash:
          "0xb0fec9e4ba9958f3f42b78ec7076d6aa6991c98b31f7efcce5e1d9faa07b3e11",
      };
      const url = `/hashes/0x465`;
      const response = await request(app.getHttpServer()).get(url);
      expect(response.body).toStrictEqual(hashResponseObject);
      expect(response.status).toBe(200);
    });
  });
});
