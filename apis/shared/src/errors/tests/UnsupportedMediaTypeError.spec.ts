import { describe, it, expect } from "@jest/globals";
import { UnsupportedMediaTypeError, ProblemDetailsError } from "../index";

describe("error UnsupportedMediaTypeError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new UnsupportedMediaTypeError("Test Error");

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have 'Unsupported Media Type' as default title", () => {
    expect.assertions(1);

    const error = new UnsupportedMediaTypeError();

    expect(error.title).toBe("Unsupported Media Type");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new UnsupportedMediaTypeError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("UnsupportedMediaTypeError");
    expect(error.status).toStrictEqual(UnsupportedMediaTypeError.statusCode);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new UnsupportedMediaTypeError("Test Error", {
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
      status: UnsupportedMediaTypeError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new UnsupportedMediaTypeError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(
      `${UnsupportedMediaTypeError.statusCode} - Test Error`
    );
  });
});
