import { describe, it, expect } from "@jest/globals";
import { PreconditionRequiredError, ProblemDetailsError } from "../index";

describe("error PreconditionRequiredError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new PreconditionRequiredError("Test Error");

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have 'Precondition Required' as default title", () => {
    expect.assertions(1);

    const error = new PreconditionRequiredError();

    expect(error.title).toBe("Precondition Required");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new PreconditionRequiredError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("PreconditionRequiredError");
    expect(error.status).toStrictEqual(PreconditionRequiredError.statusCode);
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new PreconditionRequiredError("Test Error", {
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
      status: PreconditionRequiredError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new PreconditionRequiredError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(
      `${PreconditionRequiredError.statusCode} - Test Error`
    );
  });
});
