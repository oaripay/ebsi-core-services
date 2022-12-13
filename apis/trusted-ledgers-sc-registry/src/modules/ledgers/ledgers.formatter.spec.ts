import { describe, it, expect } from "@jest/globals";
import { formatLedgers, formatRevisions } from "./ledgers.formatter";
import { LedgerInfoIdsList, RevisionsList } from "./ledgers.interface";

describe("formatLedgers", () => {
  const ledgers: LedgerInfoIdsList = {
    items: ["ledger-id", "ledger-id-2"],
    total: 42,
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;
    const name = "test";

    expect(formatLedgers(ledgers, page, pageSize, "", name)).toStrictEqual({
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
        first: `?page[after]=1&page[size]=${pageSize}&name=${name}`,
        last: `?page[after]=21&page[size]=${pageSize}&name=${name}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}&name=${name}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}&name=${name}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}&name=${name}`,
      total: 42,
    });
  });
});

describe("formatRevisions", () => {
  const revisions: RevisionsList = {
    items: ["revision-hash", "revision-hash-2"],
    total: 42,
  };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatRevisions(revisions, page, pageSize, "")).toStrictEqual({
      items: [
        {
          revisionHash: "revision-hash",
          href: "/revision-hash",
        },
        {
          revisionHash: "revision-hash-2",
          href: "/revision-hash-2",
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
