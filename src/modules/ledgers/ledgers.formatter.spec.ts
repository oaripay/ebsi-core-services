import { ethers } from "ethers";
import { formatLedgers } from "./ledgers.formatter";
import { LedgerSCRegistry } from "../../contracts/trusted-ledgers-sc";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatLedgers", () => {
  const ledgers = {
    items: ["ledger-id", "ledger-id-2"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("2"),
    prev: ethers.BigNumber.from("0"),
    next: ethers.BigNumber.from("0"),
  } as AsyncReturnType<LedgerSCRegistry["getLedgerInfoIds"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatLedgers(ledgers, page, pageSize, "")).toStrictEqual({
      items: [
        {
          ledgerInfoId: "ledger-id",
          href: "/ledger-id",
        },
        {
          ledgerInfoId: "ledger-id-2",
          href: "/ledger-id-2",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=21&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 42,
    });
  });
});
