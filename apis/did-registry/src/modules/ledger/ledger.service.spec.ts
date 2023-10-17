import { vi, describe, beforeAll, afterEach, it, expect } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { LedgerService } from "./ledger.service.js";
import { LedgerModule } from "./ledger.module.js";

describe("Ledger service", () => {
  let ledgerService: LedgerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LedgerModule],
    }).compile();

    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getContractAddress should return an address", () => {
    expect.assertions(1);
    const contractAddr = ledgerService.getContractAddress();
    expect(contractAddr).toBeDefined();
  });

  it("getContract should not request access token when called without arguments", async () => {
    expect.assertions(1);

    const sessionMock = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(LedgerService.prototype as any, "refreshConnection")
      .mockImplementation(() => vi.fn());

    await ledgerService.getContract();
    expect(sessionMock).not.toHaveBeenCalled();
  });

  it("getContract should request access token when called with arguments", async () => {
    expect.assertions(2);

    const sessionSpy = vi.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      LedgerService.prototype as any,
      "refreshConnection",
    );

    const getTokenMock = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(LedgerService.prototype as any, "getAccessToken")
      .mockImplementation(() => vi.fn());

    await ledgerService.getContract({ protectedMethod: true });
    expect(sessionSpy).toHaveBeenCalled();
    expect(getTokenMock).toHaveBeenCalled();
  });
});
