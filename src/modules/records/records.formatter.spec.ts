import { ethers } from "ethers";
import { formatRecords } from "./records.formatter";
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
          recordId: "0x123",
          href: "/0x123",
        },
        {
          recordId: "0x345",
          href: "/0x345",
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
