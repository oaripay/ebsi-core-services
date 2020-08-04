import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AxiosResponse } from "axios";

import AppService from "../src/services/app.service";
import AppController from "../src/app.controller";
import AppFormatter from "../src/util/app.formatter";
import * as testValues from "./testVar.json";
import UniversityIssuer from "../src/types/UniversityIssuer";
import GovernmentIssuer from "../src/types/GovernmentIssuer";
import TrustedIssuer from "../src/types/TrustedIssuer";
import AllExceptionsFilter from "../src/http-exception.filter";

class AppServiceMock {
  emptyArray = [];

  issuers = testValues.issuerResult;

  doesUniversityExists() {
    return this.emptyArray;
  }

  getUniversity() {
    return this.issuers;
  }

  getUniversities() {
    return this.emptyArray;
  }

  getDocumentsByUniversity() {
    return this.emptyArray;
  }

  getAccreditationsUniversity() {
    return this.emptyArray;
  }

  insertUniversity() {
    return this.emptyArray;
  }

  doesGovernmentExists() {
    return this.emptyArray;
  }

  getGovernment() {
    return this.emptyArray;
  }

  getGovernments() {
    return this.emptyArray;
  }

  getDocumentsByGovernment() {
    return this.emptyArray;
  }

  insertGovernment() {
    return this.emptyArray;
  }

  downloadDocument() {
    return this.emptyArray;
  }
}

describe("appController", () => {
  let app: INestApplication;
  let appService: AppService;

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, AppFormatter],
    })
      .overrideProvider(AppService)
      .useValue(new AppServiceMock())
      .compile();

    appService = module.get<AppService>(AppService);
    app = module.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await app.close();
  });

  describe("get routes", () => {
    it("get /health returns ok", async () => {
      expect.assertions(2);
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/health"
      );
      expect(response.text).toBe("ok");
      expect(response.status).toBe(200);
    });

    it(`#/v1/issuers`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "getUniversities")
        .mockImplementation(() => Promise.all(testValues.resultUniversities));
      jest
        .spyOn(appService, "getGovernments")
        .mockImplementation(() => Promise.all(testValues.resultGovernments));
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers?page[size]=10"
      );
      expect(response.body).toStrictEqual({
        items: [
          ...testValues.resultUniversities.map((item) => ({
            name: item.preferredName,
            did: item.issuerDID,
          })),
          ...testValues.resultGovernments.map((item) => ({
            name: item.name,
            did: item.issuerDID,
          })),
        ],
        total:
          testValues.resultUniversities.length +
          testValues.resultGovernments.length,
        pageSize: 10,
        links: {
          first:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
          prev:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
          next:
            "/trusted-issuers-registry/v1/issuers?page[after]=1&page[size]=10",
          last:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
        },
      });
      expect(response.status).toBe(200);
    });

    it(`#/v1/issuers size of 2 with 4 results`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "getUniversities")
        .mockImplementation(() => Promise.all(testValues.resultUniversities));
      jest
        .spyOn(appService, "getGovernments")
        .mockImplementation(() => Promise.all(testValues.resultGovernments));
      const it: (UniversityIssuer | GovernmentIssuer)[] = [
        ...testValues.resultUniversities,
        ...testValues.resultGovernments,
      ];

      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers?page[size]=2"
      );
      expect(response.body).toStrictEqual({
        items: it
          .map((item) => {
            return {
              name: "preferredName" in item ? item.preferredName : item.name,
              did: item.issuerDID,
            };
          })
          .slice(0, 2),
        total: 4,
        pageSize: 2,
        links: {
          first:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=2",
          prev:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=2",
          next:
            "/trusted-issuers-registry/v1/issuers?page[after]=1&page[size]=2",
          last:
            "/trusted-issuers-registry/v1/issuers?page[after]=2&page[size]=2",
        },
      });
      expect(response.status).toBe(200);
    });

    it(`#/v1/issuers invalid page number`, async () => {
      expect.assertions(3);
      jest
        .spyOn(appService, "getUniversities")
        .mockImplementation(() => Promise.all(testValues.resultUniversities));
      jest
        .spyOn(appService, "getGovernments")
        .mockImplementation(() => Promise.all(testValues.resultGovernments));
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers?page[size]=2&page[after]=3"
      );

      expect(response.body).toStrictEqual({
        status: 400,
        title: "Invalid page number",
        detail: expect.any(String),
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(response.header).toStrictEqual(
        expect.objectContaining({
          "content-type": "application/problem+json; charset=utf-8",
        })
      );
    });

    it(`#/v1/issuers/:did`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "doesUniversityExists")
        .mockImplementation(() => true);
      jest
        .spyOn(appService, "doesGovernmentExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "getUniversity")
        .mockResolvedValue(testValues.university);
      jest
        .spyOn(appService, "getDocumentsByUniversity")
        .mockImplementation(() => Promise.all(testValues.documents));
      jest.spyOn(appService, "downloadDocument").mockResolvedValue({
        status: 200,
        data: "content",
      } as AxiosResponse);
      jest
        .spyOn(appService, "getAccreditationsUniversity")
        .mockResolvedValue(testValues.accreditations);
      const expectedRes: TrustedIssuer = {
        issuerDID: "testdid",
        entities: [
          {
            type: "university",
            moderator: "test",
            status: true,
            preferredName: "test",
            alternativeName: "test",
            homepage: "test",
            escoOrganizationType: "test",
            siteLocation: "test",
            documents: [
              {
                title: "Bachelor en bioinformática",
                documentType: "Demo Bachelor doc",
                status: "Published in B.O.E. Active",
                revision: "Bachelor Royal Decree 1393/2007",
                vcCode: "4313149",
                dateStart: 1582265889,
                body: "content",
              },
            ],
            accreditations: testValues.accreditations,
          },
        ],
      };
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers/testdid"
      );
      expect(response.body).toStrictEqual(expectedRes);
      expect(response.status).toBe(200);
    });

    it(`#/v1/issuers/:did should return when issuer for gov exists`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "doesUniversityExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "doesGovernmentExists")
        .mockImplementation(() => true);
      jest
        .spyOn(appService, "getGovernment")
        .mockResolvedValue(testValues.resultGovernments);
      jest
        .spyOn(appService, "getDocumentsByGovernment")
        .mockImplementation(() =>
          Promise.all(testValues.issuerResult.documents as any)
        );
      jest.spyOn(appService, "downloadDocument").mockResolvedValue(null);
      jest
        .spyOn(appService, "getAccreditationsUniversity")
        .mockResolvedValue(testValues.accreditations);
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers/testdid"
      );
      expect(response.body).toStrictEqual({
        issuerDID: "testdid",
        entities: [
          {
            type: "government",
            documents: [
              {
                body: null,
                dateStart: 1582265889,
                documentType: "Demo Bachelor doc",
                revision: "Bachelor Royal Decree 1393/2007",
                status: "Published in B.O.E. Active",
                title: "Bachelor en bioinformática",
                vcCode: "4313149",
              },
            ],
          },
        ],
      });
      expect(response.status).toBe(200);
    });

    it(`#/v1/issuers/:did no issuer found`, async () => {
      expect.assertions(3);
      jest
        .spyOn(appService, "doesUniversityExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "doesGovernmentExists")
        .mockImplementation(() => false);
      const did = "noissuerfound";

      const response = await request(app.getHttpServer()).get(
        `/trusted-issuers-registry/v1/issuers/${did}`
      );

      expect(response.body).toStrictEqual({
        status: 404,
        title: "Issuer not found",
        detail: `The format of ${did} parameter is not valid or entity not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(response.header).toStrictEqual(
        expect.objectContaining({
          "content-type": "application/problem+json; charset=utf-8",
        })
      );
    });

    it(`#/v1/issuers/:did document is not downloaded`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "doesUniversityExists")
        .mockImplementation(() => true);
      jest
        .spyOn(appService, "doesGovernmentExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "getUniversity")
        .mockResolvedValue(testValues.university);
      jest
        .spyOn(appService, "getDocumentsByUniversity")
        .mockImplementation(() => Promise.all(testValues.documents));
      jest.spyOn(appService, "downloadDocument").mockResolvedValue(null);
      jest
        .spyOn(appService, "getAccreditationsUniversity")
        .mockResolvedValue(testValues.accreditations);
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers/testdid"
      );
      expect(response.status).toBe(200);
      expect(response.body.entities[0].documents[0].body).toBeNull();
    });

    it(`#/v1/issuers/:did document is not found`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "doesUniversityExists")
        .mockImplementation(() => true);
      jest
        .spyOn(appService, "doesGovernmentExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "getUniversity")
        .mockResolvedValue(testValues.university);
      jest
        .spyOn(appService, "getDocumentsByUniversity")
        .mockImplementation(() => Promise.all(testValues.documents));
      jest.spyOn(appService, "downloadDocument").mockResolvedValue({
        status: 404,
        data: "Not found",
      } as AxiosResponse);
      jest
        .spyOn(appService, "getAccreditationsUniversity")
        .mockResolvedValue(testValues.accreditations);
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers/testdid"
      );
      expect(response.status).toBe(200);
      expect(response.body.entities[0].documents[0].body).toBe("");
    });

    it(`#/v1/issuers/:did internal error downloading the document`, async () => {
      expect.assertions(2);
      jest
        .spyOn(appService, "doesUniversityExists")
        .mockImplementation(() => true);
      jest
        .spyOn(appService, "doesGovernmentExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "getUniversity")
        .mockResolvedValue(testValues.university);
      jest
        .spyOn(appService, "getDocumentsByUniversity")
        .mockImplementation(() => Promise.all(testValues.documents));
      jest.spyOn(appService, "downloadDocument").mockResolvedValue({
        status: 500,
        data: "Internal Server Error",
      } as AxiosResponse);
      jest
        .spyOn(appService, "getAccreditationsUniversity")
        .mockResolvedValue(testValues.accreditations);
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers-registry/v1/issuers/testdid"
      );
      expect(response.status).toBe(200);
      expect(response.body.entities[0].documents[0].body).toBeNull();
    });

    it(`#/v1/issuers will fail not found`, async () => {
      expect.assertions(3);
      jest.spyOn(appService, "getUniversities").mockImplementation(() => {
        throw new Error("test");
      });
      const response = await request(app.getHttpServer()).get(
        "/trusted-issuers/universities"
      );

      expect(response.body).toStrictEqual({
        status: 404,
        title: "Invalid service",
        detail: "Cannot GET /trusted-issuers/universities",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(response.header).toStrictEqual(
        expect.objectContaining({
          "content-type": "application/problem+json; charset=utf-8",
        })
      );
    });
  });
});
