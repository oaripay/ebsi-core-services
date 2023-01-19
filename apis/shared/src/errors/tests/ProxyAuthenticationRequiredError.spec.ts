import { describe, it, expect } from "@jest/globals";
import {
  ProxyAuthenticationRequiredError,
  ProblemDetailsError,
} from "../index";

describe("error ProxyAuthenticationRequiredError", () => {
  it("should extend ProblemDetailsError", () => {
    expect.assertions(1);

    const error = new ProxyAuthenticationRequiredError("Test Error");

    expect(error instanceof ProblemDetailsError).toBe(true);
  });

  it("should have 'Proxy Authentication Required' as default title", () => {
    expect.assertions(1);

    const error = new ProxyAuthenticationRequiredError();

    expect(error.title).toBe("Proxy Authentication Required");
  });

  it("should have the correct properties", () => {
    expect.assertions(7);

    const error = new ProxyAuthenticationRequiredError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.name).toBe("ProxyAuthenticationRequiredError");
    expect(error.status).toStrictEqual(
      ProxyAuthenticationRequiredError.statusCode
    );
    expect(error.title).toBe("Test Error");
    expect(error.type).toBe("test");
    expect(error.detail).toBeUndefined();
    expect(error.instance).toBeUndefined();
    expect(error.extensions).toStrictEqual({ custom: "value" });
  });

  it("should print the correct JSON object", () => {
    expect.assertions(2);

    const error = new ProxyAuthenticationRequiredError("Test Error", {
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
      status: ProxyAuthenticationRequiredError.statusCode,
      title: "Test Error",
      type: "test",
    });
  });

  it("should print the correct string", () => {
    expect.assertions(1);

    const error = new ProxyAuthenticationRequiredError("Test Error", {
      type: "test",
      extensions: {
        custom: "value",
      },
    });

    expect(error.toString()).toBe(
      `${ProxyAuthenticationRequiredError.statusCode} - Test Error`
    );
  });
});
