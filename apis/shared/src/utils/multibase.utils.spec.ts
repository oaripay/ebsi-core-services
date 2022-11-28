import { describe } from "@jest/globals";
import { TextDecoder } from "node:util";
import { multibase } from "./multibase.utils";

const bases: Record<
  keyof typeof multibase,
  {
    inputString: string;
    encoding: BufferEncoding;
    multibaseString: string;
  }[]
> = {
  base16: [
    {
      inputString: new TextDecoder().decode(Uint8Array.from([0x01, 0x02])),
      encoding: "utf8",
      multibaseString: "f0102",
    },
    {
      inputString: "8a173fd3e32c0fa78b90fe42d305f202244e2739",
      encoding: "hex",
      multibaseString: "f8a173fd3e32c0fa78b90fe42d305f202244e2739",
    },
    {
      inputString: "÷ïÿ",
      encoding: "utf8",
      multibaseString: "fc3b7c3afc3bf",
    },
    {
      inputString: "÷ïÿ🥰÷ïÿ😎🥶🤯",
      encoding: "utf8",
      multibaseString:
        "fc3b7c3afc3bff09fa5b0c3b7c3afc3bff09f988ef09fa5b6f09fa4af",
    },
  ],
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
  base58btc: [
    {
      inputString: "÷ïÿ",
      encoding: "utf8",
      multibaseString: "z2gTnNVSBg",
    },
    {
      inputString: "÷ïÿ🥰÷ïÿ😎🥶🤯",
      encoding: "utf8",
      multibaseString: "z31kmCPVCi3zGReVrkbcUbPSXtMTxWfNUkQFLgSJ",
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
