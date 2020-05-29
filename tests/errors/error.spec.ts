import {
  HTTPError,
  InvalidAppError,
  UnauthorizedError,
  BadRequestError,
  InvalidTokenError,
  TrustedAppNotFoundError,
  NotFoundError,
} from "../../src/errors";

describe("errors test suite", () => {
  it("should create an HTTPError and be able to obtain the error description", () => {
    expect.assertions(5);

    const httpError = new HTTPError("testTitle", 400, "testDetail");
    expect(httpError).toBeInstanceOf(HTTPError);
    expect(httpError.Name).toMatch("HTTPError");
    expect(httpError.Title).toMatch("testTitle");
    expect(httpError.Status).toBe(400);
    expect(httpError.Detail).toMatch("testDetail");
  });

  it("should create a valid InvalidAppError", () => {
    expect.assertions(2);

    const error = new InvalidAppError("test error");
    expect(error).toBeInstanceOf(InvalidAppError);
    expect(error.Detail).toMatch("test error");
  });

  it("should create a valid TrustedAppNotFoundError", () => {
    expect.assertions(2);

    const error = new TrustedAppNotFoundError("test error");
    expect(error).toBeInstanceOf(TrustedAppNotFoundError);
    expect(error.Detail).toMatch("test error");
  });

  it("should create a valid UnauthorizedError", () => {
    expect.assertions(2);

    const error = new UnauthorizedError("test error");
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.Detail).toMatch("test error");
  });

  it("should create a valid BadRequestError", () => {
    expect.assertions(2);

    const error = new BadRequestError("test error");
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.Detail).toMatch("test error");
  });

  it("should create a valid InvalidTokenError", () => {
    expect.assertions(2);

    const error = new InvalidTokenError("test error");
    expect(error).toBeInstanceOf(InvalidTokenError);
    expect(error.Detail).toMatch("test error");
  });

  it("should create a valid NotFoundError", () => {
    expect.assertions(2);

    const error = new NotFoundError("test error");
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.Detail).toMatch("test error");
  });
});
