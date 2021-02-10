import { ethers } from "ethers";
import { formatRecords, formatRecordVersions } from "./records.formatter";
import { multibase64Encode } from "../../shared/utils";
import { Timestamp } from "../../contracts/timestamp";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatRecords", () => {
  const records = {
    items: ["0x123", "0x345"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("2"),
    prev: ethers.BigNumber.from("0"),
    next: ethers.BigNumber.from("0"),
  } as AsyncReturnType<Timestamp["getRecordIds"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatRecords(records, page, pageSize, "", "?test=true")
    ).toStrictEqual({
      items: [
        {
          recordId: multibase64Encode("0x123"),
          href: `/${multibase64Encode("0x123")}`,
        },
        {
          recordId: multibase64Encode("0x345"),
          href: `/${multibase64Encode("0x345")}`,
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}?test=true`,
        last: `?page[after]=21&page[size]=${pageSize}?test=true`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}?test=true`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}?test=true`,
      total: 42,
    });
  });
});

describe("formatRecordVersions", () => {
  const totalVersions = 20;

  it("should format record versions", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatRecordVersions(totalVersions, page, pageSize, "", "?test=true")
    ).toStrictEqual({
      items: [
        {
          versionId: 4,
          href: "/4",
        },
        {
          versionId: 5,
          href: "/5",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}?test=true`,
        last: `?page[after]=10&page[size]=${pageSize}?test=true`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}?test=true`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}?test=true`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}?test=true`,
      total: totalVersions,
    });
  });
});
