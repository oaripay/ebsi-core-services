import { Test, TestingModule } from "@nestjs/testing";
import { LedgerService } from "./ledger.service";
import { LedgerModule } from "./ledger.module";

describe("Ledger service", () => {
  let ledgerService: LedgerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LedgerModule],
    }).compile();

    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("getContractAddress should return an address", () => {
    expect.assertions(1);
    const contractAddr = ledgerService.getContractAddress();
    expect(contractAddr).toBeDefined();
  });

  it("getContract should not request access token when called without arguments", async () => {
    expect.assertions(1);

    const sessionMock = jest
      .spyOn(LedgerService.prototype as any, "refreshConnection")
      .mockImplementation(() => jest.fn());

    await ledgerService.getContract();
    expect(sessionMock).not.toHaveBeenCalled();
  });

  it("getContract should request access token when called with arguments", async () => {
    expect.assertions(2);

    const sessionSpy = jest.spyOn(
      LedgerService.prototype as any,
      "refreshConnection"
    );

    const getTokenMock = jest
      .spyOn(LedgerService.prototype as any, "getAccessToken")
      .mockImplementation(() => jest.fn());

    await ledgerService.getContract({ protectedMethod: true });
    expect(sessionSpy).toHaveBeenCalled();
    expect(getTokenMock).toHaveBeenCalled();
  });
});
