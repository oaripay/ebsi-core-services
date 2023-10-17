import { describe, it, expect } from "vitest";
import { ProblemDetailsError } from "../index.js";

describe("error ProblemDetailsError", () => {
  it("should have about:blank has default type", () => {
    expect.assertions(1);

    const error = new ProblemDetailsError(1337, "Test Error");

    expect(error.type).toBe("about:blank");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new ProblemDetailsError(1337, "Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("ProblemDetailsError");
    expect(error.status).toBe(1337);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new ProblemDetailsError(1337, "Test Error", {
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
      status: 1337,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new ProblemDetailsError(1337, "Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe("1337 - Test Error");
  });
});
