import crypto from "crypto";
import { ethers } from "ethers";
import { Timestamp } from "@ebsiint-sc/timestamp";
import { formatRecords, formatRecordVersions } from "./records.formatter";
import { multibase } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

describe("formatRecords", () => {
  const records = {
    items: [
      `0x${crypto.randomBytes(32).toString("hex")}`,
      `0x${crypto.randomBytes(32).toString("hex")}`,
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("2"),
    prev: ethers.BigNumber.from("0"),
    next: ethers.BigNumber.from("0"),
  } as AsyncReturnType<Timestamp["getRecordIds"]>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    const recordIds = [
      multibase.base64url.encode(
        Buffer.from(records.items[0].replace(/^0x/, ""), "hex")
      ),
      multibase.base64url.encode(
        Buffer.from(records.items[1].replace(/^0x/, ""), "hex")
      ),
    ];

    expect(
      formatRecords(records, page, pageSize, "", "?test=true")
    ).toStrictEqual({
      items: [
        {
          recordId: recordIds[0],
          href: `/${recordIds[0]}`,
        },
        {
          recordId: recordIds[1],
          href: `/${recordIds[1]}`,
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
