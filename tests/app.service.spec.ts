import { Test } from "@nestjs/testing";
import { AppService } from "./app.service";
import { EthersService } from "./ethers.service";

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
jest.mock("./ethers.service", () => {
  return { univContract: { getTrustedIssuer: did => result }, govContract: {} };
});
describe("AppService", () => {
  let ethersService: EthersService;
  let appService: AppService;

  // beforeEach(async () => {
  //     const moduleRef = await Test.createTestingModule({
  //         providers: [AppService],
  //     }).compile();
  //     // ethersService = moduleRef.get<EthersService>(EthersService);
  //     // jest.spyOn(ethersService, 'getContracts').mockImplementation(
  //     //     () => ({univContract: { getTrustedIssuer: (did) => result }, govContract: {}}));
  //
  //     appService = moduleRef.get<AppService>(AppService);
  // });

  beforeEach(() => {
    ethersService = new EthersService();
    appService = new AppService(ethersService);
  });

  describe("getIssuer did", () => {
    it("should return the university issuer by did", async () => {
      // jest.spyOn(ethersService, 'getContracts').mockImplementation(() => ({univContract: { getTrustedIssuer: (did) => {return result} }, govContract: {}}));
      // jest.spyOn(ethersService.getContracts().univContract, 'getTrustedIssuer').mockImplementation(() => JSON.stringify(result));
      console.log(appService);
      expect(await appService.getIssuer(result.issuerDID)).toBe(
        JSON.stringify(result)
      );
    });
  });
});
