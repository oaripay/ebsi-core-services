import fs from "fs";
import path from "path";
import { JWT } from "jose";
import * as util from "util";
import { ProblemDetailsError } from "../../src/errors";
import LOGGER from "../../src/logger";
import {
  b64EncodeUrl,
  strB64dec,
  isTokenExpired,
  PRINT_SILLY,
  PRINT_INFO,
  PRINT_DEBUG,
  PRINT_ERROR,
  isHash,
  hash,
  hashFromFile,
} from "../../src/utils/util";

const testFilePath = "../data/documents/";
const testFilename = "ebsi-test-util-file-99.txt";

describe("utils Test Suite", () => {
  it("should return a the same string after coding it to base64 and decoding it", async () => {
    expect.assertions(1);
    const strTest = "this is a string to test Base64";
    const strB64coded = b64EncodeUrl(strTest);
    const strOut = strB64dec(strB64coded);
    expect(strOut).toBe(strTest);
  });

  it("should return a the same file after coding it to base64 and decoding it", async () => {
    expect.assertions(1);
    const randNum: number = Math.floor(Math.random() * 1000000);
    // creates a file and add some random data
    fs.appendFileSync(
      path.join(__dirname, testFilePath + testFilename),
      `data to append:${randNum}`,
      "utf8"
    );
    const fileData = fs.readFileSync(
      path.join(__dirname, testFilePath + testFilename),
      "utf8"
    );
    // deletes the created file
    fs.unlinkSync(path.join(__dirname, testFilePath + testFilename));

    const fileB64coded = b64EncodeUrl(fileData);
    const fileOut: string = strB64dec(fileB64coded);
    expect(fileOut).toBe(fileData);
  });

  it("should return false to an expired token", () => {
    expect.assertions(2);
    const token1 =
      "eyJraWQiOiJvaGlLeHh3TWtUYXl5eGg5b0xlTGtUOE5NVHRBSVVBUlpUNEF6bVlEM3lzIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3MiOiJlYnNpLXN0b3JhZ2UiLCJhdWQiOiJlYnNpLXN0b3JhZ2UiLCJpYXQiOjE1NzcwMzI1MTUsImV4cCI6MTU3NzAzMzQxNX0.xmKBJfDQ1m3EYNvenvzOxRKGu-PdNTcTxFDnD_QW4uC2nwa0PWs2WvSxnEZPx1AxfnvKaNIBQ6OvZxQxoJVKoA";
    const token2 =
      "eyJraWQiOiJvaGlLeHh3TWtUYXl5eGg5b0xlTGtUOE5NVHRBSVVBUlpUNEF6bVlEM3lzIiwiYWxnIjoiRVMyNTZLIn0.eyJpc3MiOiJlYnNpLXN0b3JhZ2UiLCJhdWQiOiJlYnNpLXN0b3JhZ2UiLCJpYXQiOjE1NzY5OTM3MTcsImV4cCI6MTU3Njk5NDYxN30.eyLvZEojL4ttVjyOC90q85cShfeFT3uocPOXiWegE0x48NIGGr3nk4LmbbZSPtXNUBJqBUw_15xAhpfd1-sb1w";

    expect(isTokenExpired(token1)).toBe(true);
    expect(isTokenExpired(token2)).toBe(true);
  });

  it("should throw an error sendind a non token", () => {
    expect.assertions(1);
    expect(() => isTokenExpired("token1")).toThrow(
      "JWTs must have three components"
    );
  });

  it("should return true when no payload is returned", () => {
    expect.assertions(1);
    jest.spyOn(JWT, "decode").mockReturnValue(undefined as any);
    expect(isTokenExpired("token1")).toBe(true);
  });

  it("should return true when no exp is found in payload", () => {
    expect.assertions(1);
    const payload = {};
    jest.spyOn(JWT, "decode").mockReturnValue(payload as any);
    expect(isTokenExpired("token1")).toBe(true);
  });

  it("should return true when no iat is found in payload", () => {
    expect.assertions(1);
    const payload = {
      exp: Date.now(),
    };
    jest.spyOn(JWT, "decode").mockReturnValue(payload as any);
    expect(isTokenExpired("token1")).toBe(true);
  });

  it("should return false when token has not expired", () => {
    expect.assertions(1);
    const payload = {
      exp: Date.now() + 1000,
      iat: Date.now(),
    };
    jest.spyOn(JWT, "decode").mockReturnValue(payload as any);
    expect(isTokenExpired("token1")).toBe(false);
  });

  describe("print util functions suite", () => {
    it("should call LOGGER.log with info parameter", () => {
      expect.assertions(1);
      const data = { toPrint: "some random data" };
      const operation = "test operation";
      const mockLog = jest.spyOn(LOGGER, "log").mockImplementation();
      PRINT_INFO(data, operation);
      expect(mockLog).toHaveBeenCalledWith({
        message: util.inspect(data),
        level: "info",
        operation,
      });
      mockLog.mockRestore();
    });

    it("should call LOGGER.log with debug parameter", () => {
      expect.assertions(1);
      const data = { toPrint: "some random data" };
      const operation = "test operation";
      const mockLog = jest.spyOn(LOGGER, "log").mockImplementation();
      PRINT_DEBUG(data, operation);
      expect(mockLog).toHaveBeenCalledWith({
        message: util.inspect(data),
        level: "debug",
        operation,
      });
      mockLog.mockRestore();
    });

    it("should call LOGGER.log with silly parameter", () => {
      expect.assertions(1);
      const data = { toPrint: "some random data" };
      const operation = "test operation";
      const mockLog = jest.spyOn(LOGGER, "log").mockImplementation();
      PRINT_SILLY(data, operation);
      expect(mockLog).toHaveBeenCalledWith({
        message: JSON.parse(JSON.stringify(`\n${util.inspect(data)}`)),
        level: "silly",
        operation,
      });
      mockLog.mockRestore();
    });

    it("should call LOGGER.log with silly parameter passing a string", () => {
      expect.assertions(1);
      const data = "i am a string";
      const operation = "test operation";
      const mockLog = jest.spyOn(LOGGER, "log").mockImplementation();
      PRINT_SILLY(data, operation);
      expect(mockLog).toHaveBeenCalledWith({
        message: `\n${data}`,
        level: "silly",
        operation,
      });
      mockLog.mockRestore();
    });

    it("should call LOGGER.log with an ProblemDetailsError", () => {
      expect.assertions(1);
      const error = new ProblemDetailsError(500, "error title", {
        detail: "error detail",
      });

      const operation = "test operation";
      const mockError = jest.spyOn(LOGGER, "error").mockImplementation();
      PRINT_ERROR(error, operation);
      expect(mockError).toHaveBeenCalledTimes(3);
      mockError.mockRestore();
    });

    it("should call LOGGER.log with a non ProblemDetailsError", () => {
      expect.assertions(1);
      const error = {
        name: "other error",
        message: "error message",
      };
      const operation = "test operation";
      const mockError = jest.spyOn(LOGGER, "error").mockImplementation();
      PRINT_ERROR(error, operation);
      expect(mockError).toHaveBeenCalledTimes(2);
      mockError.mockRestore();
    });

    it("should call LOGGER.log with a non ProblemDetailsError with stack and response", () => {
      expect.assertions(1);
      const error = {
        name: "other error",
        message: "error message",
        response: "error response",
        stack: "error stack",
      };
      const operation = "test operation";
      const mockError = jest.spyOn(LOGGER, "error").mockImplementation();
      PRINT_ERROR(error, operation);
      expect(mockError).toHaveBeenCalledTimes(4);
      mockError.mockRestore();
    });
  });

  it("should return true when a hash is a 32 hexadecimal character string", () => {
    expect.assertions(1);
    expect(
      isHash(
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
      )
    ).toBe(true);
  });
  it("should return false when a hash is NOT a 32 hexadecimal character string", () => {
    expect.assertions(1);
    expect(isHash("this is a test")).toBe(false);
  });
});

describe("keccak256 test suite", () => {
  it.each`
    input                    | expected
    ${""}                    | ${"0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"}
    ${"testing random data"} | ${"0x393a214ba2868e664ff200451a7f6900b7332bdcd4b8c9a790aedd9e8d57f223"}
  `(
    "should compute a valid keccak256 hash, $expected from the $input string",
    ({ input, expected }) => {
      expect(hash(input)).toBe(expected);
    }
  );

  it.each`
    input             | expected
    ${"ebsi-api.pdf"} | ${"0x93aa265e1bf4f2d5acc6bea282c02280b8343faf4c32c5b0e6ca355469ae3413"}
    ${"swagger.pdf"}  | ${"0x576382db604e41e8d5f4d8ac8c4dee3c57b3b7d3e57b1e051d128298e385eb4d"}
  `(
    "should compute a valid keccak256 hash, $expected from the $input file",
    ({ input, expected }) => {
      const fileData = fs.readFileSync(
        path.join(__dirname, testFilePath + input)
      );
      expect(hash(fileData)).toBe(expected);
    }
  );

  it.each`
    input             | expected
    ${"ebsi-api.pdf"} | ${"0x93aa265e1bf4f2d5acc6bea282c02280b8343faf4c32c5b0e6ca355469ae3413"}
    ${"swagger.pdf"}  | ${"0x576382db604e41e8d5f4d8ac8c4dee3c57b3b7d3e57b1e051d128298e385eb4d"}
  `(
    "should compute a valid keccak256 hash, $expected from the $input file",
    ({ input, expected }) => {
      const filename = path.join(__dirname, testFilePath + input);
      expect(hashFromFile(filename)).toBe(expected);
    }
  );
});
