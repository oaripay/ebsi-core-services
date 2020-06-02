import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule } from "@nestjs/common";
import * as request from "supertest";

import { NestExpressApplication } from "@nestjs/platform-express";

import { ConfigModule } from "@nestjs/config";
import AppModule from "../src/app.module";
import AppService from "../src/services/app.service";
import AppFormatter from "../src/util/app.formatter";
import EthersService from "../src/services/ethers.service";

jest.setTimeout(10000);
describe("AppController (e2e)", () => {
  let app: NestExpressApplication;
  const version = "v1";

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env", ".env.dev"]
        }),
        AppModule,
        HttpModule
      ],
      providers: [AppService, EthersService, AppFormatter]
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();

    await app.init();
  });

  it(`(GET)  trusted-issuers-registry/${version}/health`, () => {
    return request(app.getHttpServer())
      .get(`/trusted-issuers-registry/${version}/health`)
      .expect(200)
      .expect("ok");
  });

  it(`(GET)  trusted-issuers-registry/${version}/issuers`, () => {
    return request(app.getHttpServer())
      .get(`/trusted-issuers-registry/${version}/issuers`)
      .expect(200)
      .then(response => {
        expect(JSON.parse(response.text)).toEqual(
          expect.objectContaining({
            total: expect.any(Number),
            pageSize: expect.any(Number),
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
            items: expect.arrayContaining([
              expect.objectContaining({
                name: expect.any(String),
                did: expect.any(String)
              })
            ])
          })
        );
      });
  });

  it(`(GET) trusted-issuers-registry/${version}/issuers/{did}`, async () => {
    const issuers = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/${version}/issuers`
    );
    const typedIssuers: Array<{ did: string; name: string }> = JSON.parse(
      issuers.text
    ).items;
    expect(typedIssuers.length).toBeGreaterThanOrEqual(1);

    return request(app.getHttpServer())
      .get(
        `/trusted-issuers-registry/${version}/issuers/${typedIssuers[0].did}`
      )
      .expect(200)
      .then(response => {
        expect(JSON.parse(response.text)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              alternativeName: expect.any(String),
              escoOrganizationType: expect.any(String),
              homepage: expect.any(String),
              issuerDID: expect.stringMatching(typedIssuers[0].did),
              moderator: expect.any(String),
              preferredName: expect.stringMatching(typedIssuers[0].name),
              siteLocation: expect.any(String),
              accreditations: expect.any(Array),
              documents: expect.any(Array)
            })
          ])
        );
      });
  });
});
