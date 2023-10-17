import { describe, it, expect } from "vitest";
import { TooManyRequestsError, ProblemDetailsError } from "../index.js";

describe("error TooManyRequestsError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new TooManyRequestsError("Test Error");

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have 'Too Many Requests' as default title", () => {
    expect.assertions(1);

    const error = new TooManyRequestsError();

    expect(error.title).toBe("Too Many Requests");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new TooManyRequestsError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("TooManyRequestsError");
    expect(error.status).toStrictEqual(TooManyRequestsError.statusCode);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new TooManyRequestsError("Test Error", {
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
      status: TooManyRequestsError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new TooManyRequestsError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(
      `${TooManyRequestsError.statusCode} - Test Error`,
    );
  });
});
