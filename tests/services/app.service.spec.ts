import axios from "axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { Scope } from "@cef-ebsi/app-jwt";
import { of } from "rxjs";
import { ethers } from "ethers";
import AppService from "../../src/services/app.service";
import EthersService from "../../src/services/ethers.service";
import configuration from "../../src/config/configuration";
import AppController from "../../src/app.controller";
import AppFormatter from "../../src/util/app.formatter";
import GovernmentBody from "../../src/types/GovernmentBody";
import Authorize from "../../src/types/Authorize";
import UniversityBody from "../../src/types/UniversityBody";
import DocumentDto from "../../src/types/Document";
import Accreditation from "../../src/types/Accreditation";

const result = {
  issuerDID: "did:ebsi:0xBDB8618DE3ecdF37a4f13caAC7d9abc097bf9FC2",
  entities: [
    {
      moderator: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
      preferredName: "Katholieke Universiteit Leuven",
      alternativeName: "KU Leuven",
      homepage: "https://www.keuleuven.be",
      escoOrganizationType: "Educational Institution",
      siteLocation: "Leuven",
      status: true,
      documents: [
        {
          title: "Bachelor en bioinformática",
          documentType: "Demo Bachelor doc",
          status: "Published in B.O.E. Active",
          revision: "Bachelor Royal Decree 1393/2007",
          vcCode: "4313149",
          dateStart: 1582265889,
        },
      ],
      accreditations: [
        {
          targetFramework: "Europass Accreditation Database",
          targetResource: "https://accreditation.europass.eu/12341455",
        },
      ],
    },
  ],
};

const data = {
  document: {
    body: "body",
  },
};

const getTrustedIssuer = jest.fn(() => result);
const addTrustedIssuerIdentifiers = jest.fn(() => {
  return of({
    wait: () => "TrustedIssuerIdentifiersResult",
  }).toPromise();
});
const addTrustedIssuer = jest.fn(() => {
  return of({
    wait: () => result,
  }).toPromise();
});
const getAllDocumentIndexes = jest.fn((did) => [
  `0-${did}`,
  `1-${did}`,
  `2-${did}`,
]);
const getNrOfTrustedIssuers = jest.fn(async () => ({
  toNumber: () => 3,
}));
const getTrustedIssuerByIndex = jest.fn(async (id) => {
  return {
    issuer: id,
  };
});

const getNrOfAccreditations = jest.fn(() => ({
  toNumber: () => 3,
}));
const getDocument = jest.fn(async (did, item) => {
  return {
    did,
    item,
  };
});
const getAccreditation = jest.fn(async (did, item) => {
  return {
    did,
    item,
  };
});
const addDocument = jest.fn(() => {
  return of({
    wait: () => result,
  }).toPromise();
});
const isTrustedIssuer = jest.fn(() => true);
const addAccreditation = jest.fn(() => {
  return of({
    wait: () => result,
  }).toPromise();
});

jest.mock("axios", () => ({
  get: jest.fn().mockImplementation(() => Promise.resolve({ data })),
  post: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ data: { accessToken: "jwttoken" } })
    ),
}));

jest.spyOn(ethers, "Contract").mockImplementation(() => {
  return ({
    connect() {
      return {
        getTrustedIssuer,
        isTrustedIssuer,
        addTrustedIssuer,
        getAllDocumentIndexes,
        getNrOfAccreditations,
        addTrustedIssuerIdentifiers,
        addDocument,
        addAccreditation,
        getAccreditation,
        getDocument,
        getNrOfTrustedIssuers,
        getTrustedIssuerByIndex,
      };
    },
  } as unknown) as ethers.Contract;
});

describe("appService", () => {
  let app: INestApplication;
  let cfSvc: ConfigService;
  let sut: AppService;

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env", ".env.example"],
          load: [configuration],
        }),
      ],
      controllers: [AppController],
      providers: [EthersService, AppService, ConfigService, AppFormatter],
    }).compile();

    cfSvc = module.get<ConfigService>(ConfigService);
    sut = module.get<AppService>(AppService);

    app = module.createNestApplication();
    await app.init();
  });

  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await app.close();
  });

  describe("getIssuer did", () => {
    it("should insertGovernment", async () => {
      expect.assertions(2);
      const aut: Authorize = {
        cryptedMessage: "cryptedMessage",
        signature: "signature",
      };
      const gov: GovernmentBody = {
        issuerDID: "issuerDID",
        authorize: aut,
        name: "name",
        country: "country",
      };
      expect(await sut.insertGovernment(gov)).toStrictEqual(result);
      expect(addTrustedIssuer).toHaveBeenCalledWith(
        "issuerDID",
        "name",
        "country"
      );
    });

    it("should insertUniversity", async () => {
      expect.assertions(3);
      const aut: Authorize = {
        cryptedMessage: "cryptedMessage",
        signature: "signature",
      };
      const univ: UniversityBody = {
        issuerDID: "issuerDID",
        authorize: aut,
        preferredName: "preferredName",
        alternativeName: "alternativeName",
        homepage: "homepage",
        escoOrganizationType: "escoOrganizationType",
        siteLocation: "siteLocation",
        id: "id",
        legalIdentifier: "legalIdentifier",
        vatIdentifier: "vatIdentifier",
        taxIdentifier: "taxIdentifier",
        identifier: "identifier",
      };
      expect(await sut.insertUniversity(univ)).toBeUndefined();
      expect(addTrustedIssuer).toHaveBeenCalledWith(
        "issuerDID",
        "preferredName",
        "alternativeName",
        "homepage",
        "escoOrganizationType",
        "siteLocation"
      );
      expect(addTrustedIssuerIdentifiers).toHaveBeenCalledWith(
        "issuerDID",
        "id",
        "legalIdentifier",
        "vatIdentifier",
        "taxIdentifier",
        "identifier"
      );
    });

    it("should addDocumentToIssuer", async () => {
      expect.assertions(2);
      const doc: DocumentDto = {
        vcCode: "vcCode",
        title: "title",
        revision: "revision",
        status: "status",
        type: "type",
        dateStart: "dateStart",
      };

      expect(await sut.addDocumentToUniversity("did", doc)).toStrictEqual(
        result
      );
      expect(addDocument).toHaveBeenCalledWith(
        "did",
        "vcCode",
        "title",
        "revision",
        "status",
        "type",
        "dateStart"
      );
    });

    it("should addGovDocumentToIssuer", async () => {
      expect.assertions(2);
      const doc: DocumentDto = {
        vcCode: "vcCode",
        title: "title",
        revision: "revision",
        status: "status",
        type: "type",
        dateStart: "dateStart",
      };

      expect(await sut.addDocumentToGovernment("did", doc)).toStrictEqual(
        result
      );
      expect(addDocument).toHaveBeenCalledWith(
        "did",
        "vcCode",
        "title",
        "revision",
        "status",
        "dateStart"
      );
    });

    it("should addAccreditationToIssuer", async () => {
      expect.assertions(2);
      const body: Accreditation = {
        targetFramework: "targetFramework",
        targetResource: "targetResource",
      };
      expect(await sut.addAccreditationToUniversity("did", body)).toStrictEqual(
        result
      );
      expect(addAccreditation).toHaveBeenCalledWith(
        "did",
        "targetFramework",
        "targetResource"
      );
    });

    it("should return the university issuer by did", async () => {
      expect.assertions(2);
      expect(await sut.getUniversity(result.issuerDID)).toStrictEqual(result);
      expect(getTrustedIssuer).toHaveBeenCalledTimes(1);
    });

    it("should download document", async () => {
      expect.assertions(5);
      const spyGet = jest.spyOn(axios, "get");
      const spyPost = jest.spyOn(axios, "post");

      expect(await sut.downloadDocument("0xhash")).toStrictEqual({ data });

      expect(spyGet).toHaveBeenCalledWith(
        `${cfSvc
          .get("STORAGE")
          .replace(/\/$/, "")}/v1/stores/distributed/files/0xhash`,
        expect.objectContaining({
          headers: {
            Authorization: `Bearer jwttoken`,
          },
        })
      );
      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyPost).toHaveBeenCalledWith(
        `${cfSvc.get("STORAGE").replace(/\/$/, "")}/v1/sessions`,
        expect.objectContaining({
          grantType: expect.any(String),
          assertion: expect.any(String),
          scope: Scope.COMPONENT,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      expect(spyPost).toHaveBeenCalledTimes(1);
    });

    it("should get document for gov", async () => {
      expect.assertions(3);
      const expectedRes = [
        { did: "did:gov", item: "0-did:gov" },
        { did: "did:gov", item: "1-did:gov" },
        { did: "did:gov", item: "2-did:gov" },
      ];
      expect(await sut.getDocumentsByGovernment("did:gov")).toStrictEqual(
        expectedRes
      );
      expect(getAllDocumentIndexes).toHaveBeenCalledTimes(1);
      expect(getDocument).toHaveBeenCalledTimes(3);
    });

    it("should get documents", async () => {
      expect.assertions(3);
      const expectedRes = [
        { did: "did:uni", item: "0-did:uni" },
        { did: "did:uni", item: "1-did:uni" },
        { did: "did:uni", item: "2-did:uni" },
      ];
      expect(await sut.getDocumentsByUniversity("did:uni")).toStrictEqual(
        expectedRes
      );
      expect(getAllDocumentIndexes).toHaveBeenCalledTimes(1);
      expect(getDocument).toHaveBeenCalledTimes(3);
    });

    it("should getAccreditations", async () => {
      expect.assertions(3);
      const expectedRes = [
        { did: "did:uni", item: 0 },
        { did: "did:uni", item: 1 },
      ];
      expect(await sut.getAccreditationsUniversity("did:uni")).toStrictEqual(
        expectedRes
      );
      expect(getNrOfAccreditations).toHaveBeenCalledWith("did:uni");
      expect(getAccreditation).toHaveBeenCalledTimes(2);
    });

    it("should getGovernment and verify it exist", async () => {
      expect.assertions(5);
      expect(await sut.getGovernment("did:gov")).toStrictEqual(result);
      expect(await sut.doesUniversityExists("did:gov")).toStrictEqual(true);
      expect(await sut.doesGovernmentExists("did:gov")).toStrictEqual(true);
      expect(isTrustedIssuer).toHaveBeenCalledTimes(2);
      expect(getTrustedIssuer).toHaveBeenCalledWith("did:gov");
    });

    it("should getGovernments", async () => {
      expect.assertions(3);
      const expectedRes = [{ issuer: 0 }, { issuer: 1 }, { issuer: 2 }];
      expect(await sut.getGovernments()).toStrictEqual(expectedRes);
      expect(getNrOfTrustedIssuers).toHaveBeenCalledWith();
      expect(getTrustedIssuerByIndex).toHaveBeenCalledTimes(3);
    });

    it("should getUniversities", async () => {
      expect.assertions(3);
      const expectedRes = [{ issuer: 0 }, { issuer: 1 }, { issuer: 2 }];
      expect(await sut.getUniversities()).toStrictEqual(expectedRes);
      expect(getNrOfTrustedIssuers).toHaveBeenCalledWith();
      expect(getTrustedIssuerByIndex).toHaveBeenCalledTimes(3);
    });
  });
});
