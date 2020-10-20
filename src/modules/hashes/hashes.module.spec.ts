import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { throwError } from "rxjs";
import { of } from "rxjs/internal/observable/of";
import { HashesModule } from "./hashes.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import mockNotaryContract from "../../../tests/mockNotaryContract";

jest.setTimeout(20000);
jest.spyOn(ethers, "Contract").mockImplementation(mockNotaryContract);
jest
  .spyOn(ethers.providers.JsonRpcProvider.prototype, "getBlock")
  .mockImplementation(
    (): Promise<ethers.providers.Block> => {
      return of({
        transactions: [
          "0xb0fec9e4ba9958f3f42b78ec7076d6aa6991c98b31f7efcce5e1d9faa07b3e11",
        ],
        hash:
          "0x0e3912e112f9b1fbf496c375dbdcb7b5cbc139c39fed4c55f36dc6ed9cda02cb",
        parentHash:
          "0xea7f7b0f4837d711b984f781e9fa0b431a2d7fa32ffe0f1dbd9dc4cd44d8fbb8",
        number: 646595,
        timestamp: 1586171386,
        nonce: "0x0000000000000000",
        difficulty: 1,
        gasLimit: null,
        gasUsed: null,
        miner: "0xF618d305b3cC3E7181937Da874Ad07d6f2D67C10",
        extraData:
          "0xf90148a00000000000000000000000000000000000000000000000000000000000000000f854947df7b640d9c4c24f563a7d5702499521255fc165949d2375d1b45b54603a365e23e0197c0a7a8150c894da316adfafdfe6c627e9429176954f25e4a2fb8e94f618d305b3cc3e7181937da874ad07d6f2d67c10808400000000f8c9b8413b665a210deaed333a950d405a707eb0ed3a3a360e3793f562a6d3a7ecdae5953c1ca24885d5ea6bdb83260638086bb1f461bf29876bc84ddb7b9e690a42c4ba00b8417b3a99443be97120341f8b6718982a6bcd50ceffe45b5f50551acb8166bfbc3e52a5d5f282da91fbdf7f399626fb7dce8ff82c56cec3150b987493cffd9f334c01b841e4df2373c29f26133a97da019a84d3c979e948347bf7e85a8688db67b4aadf214d10e50b99a1171a8abb05745e5928a6daa9f6a3809d830253049aa2ebad830800",
      }).toPromise();
    }
  );

jest
  .spyOn(ethers.providers.JsonRpcProvider.prototype, "getLogs")
  .mockImplementation(
    (): Promise<ethers.providers.Log[]> => {
      return throwError({ message: "bad" }).toPromise();
    }
  );

describe("hashes Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HashesModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should throw Bad Request for a bad service call", async () => {
    expect.assertions(2);
    const response = await request(server).post("/hashes").send();
    expect(response.body).toStrictEqual({
      title: "Invalid service",
      status: 404,
      detail: "Cannot POST /hashes",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });

  it("should throw Expectation Failed when hash is not found in a block stored described in a REC event", async () => {
    expect.assertions(2);

    const response = await request(server)
      .get(
        "/hashes/5265d8a717cf7533fbe7ccbc45315558884aac57cb5321194e2aafa4c732d5bf"
      )
      .send();

    expect(response.body).toStrictEqual({
      title: "Expectation Failed",
      status: 417,
      detail: "bad",
      type: "about:blank",
    });
    expect(response.status).toBe(417);
  });
});
