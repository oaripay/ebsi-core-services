import { prefix0x } from "./authentication.utils";

describe("add0xPrefix", () => {
  it("should add '0x' at the beginning of the string", () => {
    expect.assertions(1);

    expect(
      prefix0x(
        "0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
      )
    ).toBe(
      "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
    );
  });

  it("should not add '0x' if the string already starts with'0x'", () => {
    expect.assertions(1);

    expect(
      prefix0x(
        "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
      )
    ).toBe(
      "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
    );
  });
});
