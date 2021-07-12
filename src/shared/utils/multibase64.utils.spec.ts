import {
  multibase64Decode,
  multibase64Encode,
  multihashEncode,
} from "./multibase64.utils";

describe("multibase64Encode", () => {
  it("should produce the expected result", () => {
    expect.assertions(2);

    // Reuse values of https://github.com/multiformats/js-multibase/blob/93ab644c6b7b239b5c87e86ed1fd5c40c58a2a8b/test/multibase.spec.js#L80
    expect(multibase64Encode("÷ïÿ")).toStrictEqual("uw7fDr8O_");
    expect(multibase64Encode("÷ïÿ🥰÷ïÿ😎🥶🤯")).toStrictEqual(
      "uw7fDr8O_8J-lsMO3w6_Dv_CfmI7wn6W28J-krw"
    );
  });
});

describe("multibase64Decode", () => {
  it("should produce the expected result", () => {
    expect.assertions(2);

    expect(multibase64Decode("uw7fDr8O_")).toStrictEqual("÷ïÿ");

    expect(
      multibase64Decode("uw7fDr8O_8J-lsMO3w6_Dv_CfmI7wn6W28J-krw")
    ).toStrictEqual("÷ïÿ🥰÷ïÿ😎🥶🤯");
  });

  it("should throw an error if we provide an invalid input", () => {
    expect.assertions(1);

    expect(() => multibase64Decode("test")).toThrow(
      new Error("Unexpected end of data")
    );
  });
});

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
    ).toThrow(
      new Error(
        "invalid character 'X' in '41dd7b6443542e75701aa98a0c235951a28a0d851b11XXX64d20022ab11d2589a8'"
      )
    );

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
