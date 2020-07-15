const errors = require("../../src/errors");

describe("error class", () => {
  it("handler errors", () => {
    expect.assertions(4);
    const err = new Error("fatal error");
    const res = {
      setHeader(field, value) {
        expect(field).toBe("Content-Type");
        expect(value).toBe("application/problem+json");
      },

      status(s) {
        expect(s).toBe(500);
      },

      send(result) {
        expect(result).toStrictEqual({
          title: "Internal Server Error",
          status: 500,
          detail:
            "The server encountered an internal error and was unable to complete your request",
        });
      },
    };

    const next = () => {};

    errors.handler(err, undefined, res, next);
  });
});
