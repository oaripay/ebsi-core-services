import { describe, it, expect } from "vitest";
import { BadRequestError, ProblemDetailsError } from "../index.js";

describe("error BadRequestError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new BadRequestError("Test Error");

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have 'Bad Request' as default title", () => {
    expect.assertions(1);

    const error = new BadRequestError();

    expect(error.title).toBe("Bad Request");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new BadRequestError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("BadRequestError");
    expect(error.status).toStrictEqual(BadRequestError.statusCode);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new BadRequestError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });
    const jsonError = error.toJSON();

    // JSON.stringify should call toJSON
    expect(JSON.parse(JSON.stringify(error))).toStrictEqual(jsonError);
    expect(jsonError).toStrictEqual({
      custom: "value",
      status: BadRequestError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new BadRequestError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(`${BadRequestError.statusCode} - Test Error`);
  });
});
