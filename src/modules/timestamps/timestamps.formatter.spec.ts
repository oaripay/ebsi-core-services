import { ethers } from "ethers";
import { formatTimestamps } from "./timestamps.formatter";
import { multibase64Encode } from "./timestamps.utils";
import { Timestamp } from "../../contracts/timestamp";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatTimestamps", () => {
  const timestamps = {
    items: ["0x123", "0x345"],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("2"),
    prev: ethers.BigNumber.from("0"),
    next: ethers.BigNumber.from("0"),
  } as AsyncReturnType<Timestamp["getTimestamps"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(
      formatTimestamps(timestamps, page, pageSize, "", "?test=true")
    ).toStrictEqual({
      items: [
        {
          timestampId: multibase64Encode("0x123"),
          href: `/${multibase64Encode("0x123")}`,
        },
        {
          timestampId: multibase64Encode("0x345"),
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
