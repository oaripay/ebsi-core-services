import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule } from "@nestjs/common";
import request from "supertest";

import { NestExpressApplication } from "@nestjs/platform-express";

import { ConfigModule } from "@nestjs/config";
import AppModule from "../src/app.module";
import AppService from "../src/services/app.service";
import AppFormatter from "../src/util/app.formatter";
import EthersService from "../src/services/ethers.service";

jest.setTimeout(10000);
describe("appModule", () => {
  let app: NestExpressApplication;
  const version = "v1";

  // eslint-disable-next-line jest/no-hooks
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env", ".env.dev"],
        }),
        AppModule,
        HttpModule,
      ],
      providers: [AppService, EthersService, AppFormatter],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();

    await app.init();
  });

  it(`(GET) trusted-issuers-registry/${version}/health`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/${version}/health`
    );
    expect(response.status).toBe(200);
    expect(response.text).toStrictEqual("ok");
  });
});
