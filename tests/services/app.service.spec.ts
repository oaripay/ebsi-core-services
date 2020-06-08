import axios from "axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import ebsiAppJwt from "@cef-ebsi/app-jwt";
import Agent from "@cef-ebsi/app-jwt/dist/agent";
import AppService from "../../src/services/app.service";
import EthersService from "../../src/services/ethers.service";
import configuration from "../../src/config/configuration";
import AppController from "../../src/app.controller";
import AppFormatter from "../../src/util/app.formatter";

// dotenv.config();
const result = {
  moderator: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
  issuerDID: "did:ebsi:0xBDB8618DE3ecdF37a4f13caAC7d9abc097bf9FC2",
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
      dateStart: 1582265889
    }
  ],
  accreditations: [
    {
      targetFramework: "Europass Accreditation Database",
      targetResource: "https://accreditation.europass.eu/12341455"
    }
  ]
};
const data = {
  document: {
    body: "body"
  }
};
const getTrustedIssuer = jest.fn(() => result);
const getAllDocumentIndexes = jest.fn(did => [
  `0-${did}`,
  `1-${did}`,
  `2-${did}`
]);
const getDocument = jest.fn(async (did, item) => {
  return {
    did,
    item
  };
});

jest.mock("axios", () => ({
  get: jest.fn().mockImplementation(() => Promise.resolve(data)),
  post: jest.fn().mockImplementation(() => Promise.resolve({ data: {} }))
}));
jest.mock("ethers", () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn()
    },
    Contract: jest.fn().mockImplementation(() => ({
      connect() {
        return {
          getTrustedIssuer,
          getAllDocumentIndexes,
          getDocument
        };
      }
    })),
    Wallet: jest.fn().mockImplementation(() => ({}))
  }
}));
describe("AppService", () => {
  let app: INestApplication;
  let cfSvc: ConfigService;
  let sut: AppService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env", ".env.example"],
          load: [configuration]
        })
      ],
      controllers: [AppController],
      providers: [EthersService, AppService, ConfigService, AppFormatter]
    }).compile();

    cfSvc = module.get<ConfigService>(ConfigService);
    sut = module.get<AppService>(AppService);

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getIssuer did", () => {
    it("should return the university issuer by did", async () => {
      expect.assertions(2);
      expect(await sut.getIssuer(result.issuerDID)).toStrictEqual(result);
      expect(getTrustedIssuer).toHaveBeenCalledTimes(1);
    });
    it("should download document", async () => {
      const spyGet = jest.spyOn(axios, "get");
      const spyPost = jest.spyOn(axios, "post");

      const spyAgent = jest
        .spyOn(ebsiAppJwt, "Agent")
        .mockImplementationOnce((name, privateKey, provider) => {
          return ({
            newRequest: appName =>
              `${appName}-grantType=client_credentials&clientAssertionType=`,
            name,
            privateKey,
            provider
          } as unknown) as Agent;
        });
      expect(await sut.downloadDocument("0xhash")).toStrictEqual(data);
      expect(spyAgent).toHaveBeenCalledTimes(1);

      expect(spyGet).toHaveBeenCalledWith(
        `${cfSvc
          .get("STORAGE")
          .replace(/\/$/, "")}/v1/stores/distributed/files/0xhash`,
        {
          headers: {
            Authorization: `Bearer ${this.jwtToken}`
          }
        }
      );
      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyPost).toHaveBeenCalledWith(
        `${cfSvc.get("STORAGE").replace(/\/$/, "")}/v1/sessions`,
        expect.stringContaining(
          "grantType=client_credentials&clientAssertionType="
        ),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }
      );
      expect(spyPost).toHaveBeenCalledTimes(1);
    });
    it("should get document for gov", async () => {
      expect.assertions(3);
      const expectedRes = [
        { did: "did:gov", item: "0-did:gov" },
        { did: "did:gov", item: "1-did:gov" },
        { did: "did:gov", item: "2-did:gov" }
      ];
      expect(await sut.getDocumentsForGov("did:gov")).toStrictEqual(
        expectedRes
      );
      expect(getAllDocumentIndexes).toHaveBeenCalledTimes(1);
      expect(getDocument).toHaveBeenCalledTimes(3);
    });
  });
});
