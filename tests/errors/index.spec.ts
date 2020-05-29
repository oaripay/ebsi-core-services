import httpMocks from "node-mocks-http";
import { handleError, HTTPError } from "../../src/errors";

describe("handleError middleware", () => {
  it("should call next when headerSent are true", () => {
    expect.assertions(2);
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const err = new HTTPError("Test Error", 505, "this is an error");

    const next = jest.fn();
    next.mockImplementation((input) => {
      return input;
    });
    res.send("OK");
    handleError(err, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("should call next when headerSent are false with a 400 Error", () => {
    expect.assertions(1);
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const err = new Error("Text error: 400");

    const next = jest.fn();
    next.mockImplementation((input) => {
      return input;
    });
    handleError(err, req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call next when headerSent are false: Internal Error", () => {
    expect.assertions(1);
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const err = new Error("Text error: another Error");

    const next = jest.fn();
    next.mockImplementation((input) => {
      return input;
    });
    handleError(err, req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should print values with EBSI_ENV set to local", () => {
    expect.assertions(1);
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const err = new Error("Sample");

    const next = jest.fn();
    next.mockImplementation((input) => {
      return input;
    });
    process.env.EBSI_ENV = "local";
    handleError(err, req, res, next);
    process.env.EBSI_ENV = "test";
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should NOT print values with EBSI_ENV set to test", () => {
    expect.assertions(1);
    process.env.EBSI_ENV = "test";
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const err = new Error("Sample");

    const next = jest.fn();
    next.mockImplementation((input) => {
      return input;
    });
    handleError(err, req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
