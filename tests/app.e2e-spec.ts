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
    expect.assertions(8);
    const issuers = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/${version}/issuers`
    );
    const typedIssuers: Array<{ did: string; name: string }> =
      issuers.body.items;

    expect(typedIssuers.length).toBeGreaterThanOrEqual(1);

    // Fetch all issuers upfront
    const allIssuersResponses: any = await Promise.all(
      typedIssuers.map(async (iss) => {
        const res = await request(app.getHttpServer()).get(
          `/trusted-issuers-registry/${version}/issuers/${iss.did}`
        );
        return { body: res.body, status: res.status, originalIssuer: iss };
      })
    );

    // Check a "university" issuer
    const universityResponse = allIssuersResponses.find(
      (issResponse) => issResponse.body.entities[0].type === "university"
    );

    expect(universityResponse.status).toBe(200);
    expect(universityResponse.body).toStrictEqual(
      expect.objectContaining({
        issuerDID: expect.stringMatching(universityResponse.originalIssuer.did),
        entities: expect.arrayContaining([
          expect.objectContaining({
            accreditations: expect.any(Array),
            alternativeName: expect.any(String),
            documents: expect.any(Array),
            escoOrganizationType: expect.any(String),
            homepage: expect.any(String),
            moderator: expect.any(String),
            preferredName: expect.stringMatching(
              universityResponse.originalIssuer.name
            ),
            siteLocation: expect.any(String),
            status: expect.any(Boolean),
            type: "university",
          }),
        ]),
      })
    );

    expect(
      universityResponse.body.entities[0].documents.length
    ).toBeGreaterThan(0);

    // check connection with storage api
    expect(
      universityResponse.body.entities[0].documents[0].body
    ).not.toBeNull();

    // Check a "government" issuer
    const governmentResponse = allIssuersResponses.find(
      (issResponse) => issResponse.body.entities[0].type === "government"
    );

    expect(governmentResponse.status).toBe(200);
    expect(governmentResponse.body).toStrictEqual(
      expect.objectContaining({
        issuerDID: expect.stringMatching(governmentResponse.originalIssuer.did),
        entities: expect.arrayContaining([
          expect.objectContaining({
            type: "government",
            moderator: expect.any(String),
            documents: expect.any(Array),
            status: expect.any(Boolean),
            name: expect.any(String),
            country: expect.any(String),
          }),
        ]),
      })
    );

    expect(
      governmentResponse.body.entities[0].documents.length
    ).toBeGreaterThan(0);
  });
});
