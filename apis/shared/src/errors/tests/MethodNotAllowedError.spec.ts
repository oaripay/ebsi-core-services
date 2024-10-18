import { describe, it, expect } from "vitest";
import { MethodNotAllowedError, ProblemDetailsError } from "../index.js";

describe("error MethodNotAllowedError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new MethodNotAllowedError("Test Error", ["DELETE"]);

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have the correct properties", () => {
    expect.assertions(8);

    const error = new MethodNotAllowedError("Test Error", ["GET"], {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("MethodNotAllowedError");
    expect(error.status).toStrictEqual(MethodNotAllowedError.statusCode);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
    expect(error.headers).toStrictEqual({ Allow: "GET" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new MethodNotAllowedError("Test Error", ["GET"], {
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
      status: MethodNotAllowedError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new MethodNotAllowedError("Test Error", ["GET"], {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(
      `${MethodNotAllowedError.statusCode} - Test Error`,
    );
  });
});
