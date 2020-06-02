import * as dotenv from "dotenv";
import axios from "axios";
import AppService from "../../src/services/app.service";
import EthersService from "../../src/services/ethers.service";

dotenv.config();
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
jest.mock("axios");
describe("AppService", () => {
  let ethersService: EthersService;
  let sut: AppService;

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getIssuer did", () => {
    it("should return the university issuer by did", async () => {
      const getTrustedIssuer = jest.fn(() => result);
      const res = {
        univContract: { getTrustedIssuer },

        govContract: this.govTrustedIssuersContract
      };

      ethersService = new EthersService();

      jest.spyOn(ethersService, "getContracts").mockImplementation(() => res);
      sut = new AppService(ethersService);

      expect(await sut.getIssuer(result.issuerDID)).toStrictEqual(result);
      expect(getTrustedIssuer).toHaveBeenCalledWith(result.issuerDID);
      expect(getTrustedIssuer).toHaveBeenCalledTimes(1);
    });
    it("should download document", async () => {
      const data = {
        document: {
          body: "body"
        }
      };
      const spyGet = jest
        .spyOn(axios, "get")
        .mockImplementationOnce(() => Promise.resolve(data));
      const spyPost = jest
        .spyOn(axios, "post")
        .mockImplementationOnce(() => Promise.resolve({ data: {} }));
      const getTrustedIssuer = jest.fn(() => result);
      const res = {
        univContract: { getTrustedIssuer },

        govContract: this.govTrustedIssuersContract
      };

      ethersService = new EthersService();

      jest.spyOn(ethersService, "getContracts").mockImplementation(() => res);
      sut = new AppService(ethersService);

      expect(await sut.downloadDocument("0xhash")).toStrictEqual(data);
      expect(spyGet).toHaveBeenCalledWith(
        `${process.env.STORAGE.replace(
          /\/$/,
          ""
        )}/v1/stores/distributed/files/0xhash`,
        {
          headers: {
            Authorization: `Bearer ${this.jwtToken}`
          }
        }
      );
      expect(spyGet).toHaveBeenCalledTimes(1);
      expect(spyPost).toHaveBeenCalledWith(
        `${process.env.STORAGE.replace(/\/$/, "")}/v1/sessions`,
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
      const res = {
        univContract: { getTrustedIssuer },

        govContract: { getAllDocumentIndexes, getDocument }
      };

      ethersService = new EthersService();

      const ethSvcSpy = jest
        .spyOn(ethersService, "getContracts")
        .mockImplementation(() => res);
      sut = new AppService(ethersService);
      const expectedRes = [
        { did: "did:gov", item: "0-did:gov" },
        { did: "did:gov", item: "1-did:gov" },
        { did: "did:gov", item: "2-did:gov" }
      ];
      expect(await sut.getDocumentsForGov("did:gov")).toStrictEqual(
        expectedRes
      );
      expect(ethSvcSpy).toHaveBeenCalledTimes(2);
      expect(getAllDocumentIndexes).toHaveBeenCalledTimes(1);
      expect(getDocument).toHaveBeenCalledTimes(3);
    });
  });
});
