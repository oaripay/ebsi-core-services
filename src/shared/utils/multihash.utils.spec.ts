import { multihashEncode } from "./multihash.utils";

describe("multihashEncode", () => {
  it("should produce the expected result", () => {
    expect.assertions(3);

    expect(
      multihashEncode(
        "41dd7b6443542e75701aa98a0c235951a28a0d851b11564d20022ab11d2589a8",
        "sha2-256"
      )
    ).toStrictEqual(
      "122041dd7b6443542e75701aa98a0c235951a28a0d851b11564d20022ab11d2589a8"
    );

    // Same result whether the input string is prefixed with 0x or not
    expect(
      multihashEncode(
        "0x41dd7b6443542e75701aa98a0c235951a28a0d851b11564d20022ab11d2589a8",
        "sha2-256"
      )
    ).toStrictEqual(
      "122041dd7b6443542e75701aa98a0c235951a28a0d851b11564d20022ab11d2589a8"
    );

    // Should support truncated hashes (here, 8 bytes)
    expect(
      multihashEncode(
        Buffer.from(
          "41dd7b6443542e75701aa98a0c235951a28a0d851b11564d20022ab11d2589a8",
          "hex"
        )
          .slice(0, 8)
          .toString("hex"),
        "sha2-256",
        8
      )
    ).toStrictEqual("120841dd7b6443542e75");
  });

  it("should throw an error when the input is not valid", () => {
    expect.assertions(2);

    expect(() =>
      multihashEncode(
        "41dd7b6443542e75701aa98a0c235951a28a0d851b11XXX64d20022ab11d2589a8",
        "sha2-256"
      )
    ).toThrow(new Error("Non-base16 character"));

    expect(() =>
      multihashEncode(
        "41dd7b6443542e75701aa98a0c235951a28a0d851b11564d22ab11d2589a8",
        "sha2-256"
      )
    ).toThrow(new Error("Unexpected end of data"));
  });

  it("should throw an error when the algorithm is not valid", () => {
    expect.assertions(1);

    expect(() =>
      multihashEncode(
        "41dd7b6443542e75701aa98a0c235951a28a0d851b11564d20022ab11d2589a8",
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore Ignored for the test
        "test"
      )
    ).toThrow(new Error("Unrecognized hash function named: test"));
  });
});
