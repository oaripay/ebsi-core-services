import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule } from "@nestjs/common";
import request from "supertest";

import { NestExpressApplication } from "@nestjs/platform-express";

import { ConfigModule } from "@nestjs/config";
import AppModule from "../src/app.module";
import AppService from "../src/services/app.service";
import AppFormatter from "../src/util/app.formatter";
import EthersService from "../src/services/ethers.service";
import AllExceptionsFilter from "../src/http-exception.filter";

jest.setTimeout(10000);
describe("appController (e2e)", () => {
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
    app.useGlobalFilters(new AllExceptionsFilter());
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

  it(`(GET) trusted-issuers-registry/${version}/issuers`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/${version}/issuers`
    );
    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        total: expect.any(Number),
        pageSize: expect.any(Number),
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/trusted-issuers-registry/${version}/issuers`
          ),
          prev: expect.stringContaining(
            `/trusted-issuers-registry/${version}/issuers`
          ),
          next: expect.stringContaining(
            `/trusted-issuers-registry/${version}/issuers`
          ),
          last: expect.stringContaining(
            `/trusted-issuers-registry/${version}/issuers`
          ),
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            did: expect.any(String),
          }),
        ]),
      })
    );
  });

  it(`(GET) trusted-issuers-registry/${version}/issuers/{did}`, async () => {
    expect.assertions(5);
    const issuers = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/${version}/issuers`
    );
    const typedIssuers: Array<{ did: string; name: string }> =
      issuers.body.items;
    expect(typedIssuers.length).toBeGreaterThanOrEqual(1);

    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/${version}/issuers/${typedIssuers[0].did}`
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        issuerDID: expect.stringMatching(typedIssuers[0].did),
        entities: expect.arrayContaining([
          expect.objectContaining({
            alternativeName: expect.any(String),
            escoOrganizationType: expect.any(String),
            homepage: expect.any(String),
            moderator: expect.any(String),
            preferredName: expect.stringMatching(typedIssuers[0].name),
            siteLocation: expect.any(String),
            accreditations: expect.any(Array),
            documents: expect.any(Array),
          }),
        ]),
      })
    );

    // check connection with storage api
    expect(response.body.entities[0].documents.length).toBeGreaterThan(0);
    expect(response.body.entities[0].documents[0].body).not.toBeNull();
  });
});
