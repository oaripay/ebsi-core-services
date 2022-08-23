import { describe } from "@jest/globals";
import { multibase } from "./multibase.utils";

const bases: Record<
  keyof typeof multibase,
  {
    inputString: string;
    encoding: BufferEncoding;
    multibaseString: string;
  }[]
> = {
  base64: [
    {
      inputString: "÷ïÿ",
      encoding: "utf8",
      multibaseString: "mw7fDr8O/",
    },
    {
      inputString: "÷ïÿ🥰÷ïÿ😎🥶🤯",
      encoding: "utf8",
      multibaseString: "mw7fDr8O/8J+lsMO3w6/Dv/CfmI7wn6W28J+krw",
    },
  ],
  base64url: [
    {
      inputString: "÷ïÿ",
      encoding: "utf8",
      multibaseString: "uw7fDr8O_",
    },
    {
      inputString: "÷ïÿ🥰÷ïÿ😎🥶🤯",
      encoding: "utf8",
      multibaseString: "uw7fDr8O_8J-lsMO3w6_Dv_CfmI7wn6W28J-krw",
    },
  ],
};

describe("multibase", () => {
  describe.each(Object.keys(bases))("%s", (base: keyof typeof bases) => {
    describe("decode", () => {
      it("should throw an error if we provide an invalid input", () => {
        expect.assertions(1);

        expect(() => multibase[base].decode("test")).toThrow(
          new Error(
            `Unable to decode multibase string "test", ${base} decoder only supports inputs prefixed with ${multibase[base].prefix}`
          )
        );
      });
    });

    const dataset = bases[base];

    describe.each(Object.keys(dataset))("Test case #%i", (i: string) => {
      const data = dataset[parseInt(i, 10)];

      describe("encode", () => {
        it("should produce the expected result", () => {
          expect.assertions(1);

          expect(
            multibase[base].encode(Buffer.from(data.inputString, data.encoding))
          ).toStrictEqual(data.multibaseString);
        });
      });

      describe("decode", () => {
        it("should produce the expected result", () => {
          expect.assertions(1);

          expect(
            Buffer.from(multibase[base].decode(data.multibaseString)).toString(
              data.encoding
            )
          ).toStrictEqual(data.inputString);
        });
      });
    });
  });
});
