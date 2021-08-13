import { multibase64Decode, multibase64Encode } from "./multibase64.utils";

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
      new Error(
        'Unable to decode multibase string "test", base64url decoder only supports inputs prefixed with u'
      )
    );
  });
});
