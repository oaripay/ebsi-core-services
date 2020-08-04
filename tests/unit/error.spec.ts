import {
  InvalidAppError,
  InvalidTokenError,
  TrustedAppNotFoundError,
} from "../../src/errors";

describe("errors test suite", () => {
  it("should create a valid InvalidAppError", () => {
    expect.assertions(2);

    const error = new InvalidAppError("test error");
    expect(error).toBeInstanceOf(InvalidAppError);
    expect(error.detail).toMatch("test error");
  });

  it("should create a valid TrustedAppNotFoundError", () => {
    expect.assertions(2);

    const error = new TrustedAppNotFoundError("test error");
    expect(error).toBeInstanceOf(TrustedAppNotFoundError);
    expect(error.detail).toMatch("test error");
  });

  it("should create a valid InvalidTokenError", () => {
    expect.assertions(2);

    const error = new InvalidTokenError("test error");
    expect(error).toBeInstanceOf(InvalidTokenError);
    expect(error.detail).toMatch("test error");
  });
});
