import * as request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";

import AppService from "../src/services/app.service";
import AppController from "../src/app.controller";
import AppFormatter from "../src/util/app.formatter";
import * as testValues from "./testVar.json";
import UniversityIssuer from "../src/types/UniversityIssuer";
import GovernmentIssuer from "../src/types/GovernmentIssuer";

class AppServiceMock {
  getIssuer() {
    return testValues.issuerResult;
  }

  getUniversityTrustedIssuers() {
    return [];
  }

  getDocuments() {
    return [];
  }

  getGovTrustedIssuers() {
    return [];
  }

  doesIssuerExists() {
    return [];
  }

  doesIssuerForGovExists() {
    return [];
  }

  insertUniversity() {
    return [];
  }

  downloadDocument() {
    return [];
  }

  getAccreditations() {
    return [];
  }
}

describe("AppController", () => {
  let app: INestApplication;
  let appService: AppService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, AppFormatter]
    })
      .overrideProvider(AppService)
      .useValue(new AppServiceMock())
      .compile();

    appService = module.get<AppService>(AppService);

    app = module.createNestApplication();
    await app.init();
  });

  describe("Get routes", () => {
    it(`#/v1/issuers`, () => {
      jest
        .spyOn(appService, "getUniversityTrustedIssuers")
        .mockImplementation(() => Promise.all(testValues.resultUniversities));
      return request(app.getHttpServer())
        .get("/trusted-issuers-registry/v1/issuers?page[size]=10")
        .expect(200)
        .expect({
          items: testValues.resultUniversities.map(item => {
            return { name: item.preferredName, did: item.issuerDID };
          }),
          total: testValues.resultUniversities.length,
          pageSize: "10",
          first:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
          prev:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10",
          next:
            "/trusted-issuers-registry/v1/issuers?page[after]=1&page[size]=10",
          last:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10"
        });
    });

    it(`#/v1/issuers size of 2 with 4 results`, () => {
      jest
        .spyOn(appService, "getUniversityTrustedIssuers")
        .mockImplementation(() => Promise.all(testValues.resultUniversities));
      jest
        .spyOn(appService, "getGovTrustedIssuers")
        .mockImplementation(() => Promise.all(testValues.resultGov));
      const it: (UniversityIssuer | GovernmentIssuer)[] = [
        ...testValues.resultUniversities,
        ...testValues.resultGov
      ];

      return request(app.getHttpServer())
        .get("/trusted-issuers-registry/v1/issuers?page[size]=2")
        .expect(200)
        .expect({
          items: it
            .map(item => {
              return {
                name: "preferredName" in item ? item.preferredName : item.name,
                did: item.issuerDID
              };
            })
            .slice(0, 2),
          total: 4,
          pageSize: "2",
          first:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=2",
          prev:
            "/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=2",
          next:
            "/trusted-issuers-registry/v1/issuers?page[after]=1&page[size]=2",
          last:
            "/trusted-issuers-registry/v1/issuers?page[after]=2&page[size]=2"
        });
    });
    it(`#/v1/issuers invalid page number`, () => {
      jest
        .spyOn(appService, "getUniversityTrustedIssuers")
        .mockImplementation(() => Promise.all(testValues.resultUniversities));
      jest
        .spyOn(appService, "getGovTrustedIssuers")
        .mockImplementation(() => Promise.all(testValues.resultGov));
      return request(app.getHttpServer())
        .get("/trusted-issuers-registry/v1/issuers?page[size]=2&page[after]=3")
        .expect(400)
        .expect(res => {
          const resp = JSON.parse(res.text);
          expect(resp.message).toEqual("invalid page number");
        });
    });

    it(`#/v1/issuers/:did`, () => {
      jest.spyOn(appService, "doesIssuerExists").mockImplementation(() => true);
      jest
        .spyOn(appService, "doesIssuerForGovExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "getIssuer")
        .mockResolvedValue(testValues.univBody);
      jest
        .spyOn(appService, "getDocuments")
        .mockImplementation(() =>
          Promise.all(testValues.issuerResult.documents)
        );
      jest.spyOn(appService, "downloadDocument").mockResolvedValue(null);
      jest
        .spyOn(appService, "getAccreditations")
        .mockResolvedValue(testValues.issuerResult.accreditations);
      const expectedRes = {
        issuerDID: "test",
        alternativeName: "test",
        homepage: "test",
        escoOrganizationType: "test",
        siteLocation: "test",
        documents: [
          {
            title: testValues.issuerResult.documents[0].title,
            documentType:
              testValues.issuerResult.documents[0].documentType || "",
            status: testValues.issuerResult.documents[0].status,
            revision: testValues.issuerResult.documents[0].revision,
            vcCode: testValues.issuerResult.documents[0].vcCode,
            dateStart: parseInt(
              testValues.issuerResult.documents[0].dateStart,
              10
            ),
            body: ""
          }
        ],
        accreditations: [
          {
            targetFramework: "Europass Accreditation Database",
            targetResource: "https://accreditation.europass.eu/12341455"
          }
        ]
      };
      return request(app.getHttpServer())
        .get("/trusted-issuers-registry/v1/issuers/testdid")
        .expect(200)
        .then(response => {
          const res = JSON.parse(response.text);
          expect(res).toEqual([expectedRes]);
        });
    });
    it(`#/v1/issuers/:did no issuer found`, () => {
      jest
        .spyOn(appService, "doesIssuerExists")
        .mockImplementation(() => false);
      jest
        .spyOn(appService, "doesIssuerForGovExists")
        .mockImplementation(() => false);
      const did = "noissuerfound";

      return request(app.getHttpServer())
        .get(`/trusted-issuers-registry/v1/issuers/${did}`)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toEqual(
            `The format of ${did} parameter is not valid or entity not found`
          );
        });
    });
    it(`#/v1/issuers will fail not found`, () => {
      jest
        .spyOn(appService, "getUniversityTrustedIssuers")
        .mockImplementation(() => {
          throw new Error("test");
        });
      return request(app.getHttpServer())
        .get("/trusted-issuers/universities")
        .expect(404)
        .expect(res => {
          const resp = JSON.parse(res.text);

          expect(resp.message).toEqual(
            "Cannot GET /trusted-issuers/universities"
          );
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
