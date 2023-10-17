import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import { Timestamp } from "@ebsiint-sc/timestamp-v2";
import { multibase, multihashEncode } from "@ebsiint-api/shared";
import { formatTimestamps } from "./timestamps.formatter.js";

describe("formatTimestamps", () => {
  const timestamps = {
    items: [
      `0x${crypto.randomBytes(32).toString("hex")}`,
      `0x${crypto.randomBytes(32).toString("hex")}`,
    ],
    total: ethers.BigNumber.from("42"),
    howMany: ethers.BigNumber.from("2"),
    prev: ethers.BigNumber.from("0"),
    next: ethers.BigNumber.from("0"),
  } as Awaited<ReturnType<Timestamp["getTimestamps"]>>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    const timestampIds = [
      multibase.base64url.encode(
        multihashEncode(
          timestamps.items[0]!.replace(/^0x/, ""),
          "sha2-256",
          32,
        ),
      ),
      multibase.base64url.encode(
        multihashEncode(
          timestamps.items[1]!.replace(/^0x/, ""),
          "sha2-256",
          32,
        ),
      ),
    ];

    expect(
      formatTimestamps(timestamps, page, pageSize, "", "?test=true"),
    ).toStrictEqual({
      items: [
        {
          timestampId: timestampIds[0],
          href: `/${timestampIds[0]}`,
        },
        {
          timestampId: timestampIds[1],
          href: `/${timestampIds[1]}`,
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
