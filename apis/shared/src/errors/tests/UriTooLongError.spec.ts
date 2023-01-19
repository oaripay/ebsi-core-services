import { describe, it, expect } from "@jest/globals";
import { UriTooLongError, ProblemDetailsError } from "../index";

describe("error UriTooLongError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new UriTooLongError("Test Error");

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have 'URI Too Long' as default title", () => {
    expect.assertions(1);

    const error = new UriTooLongError();

    expect(error.title).toBe("URI Too Long");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new UriTooLongError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("UriTooLongError");
    expect(error.status).toStrictEqual(UriTooLongError.statusCode);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new UriTooLongError("Test Error", {
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
      status: UriTooLongError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new UriTooLongError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(`${UriTooLongError.statusCode} - Test Error`);
  });
});
