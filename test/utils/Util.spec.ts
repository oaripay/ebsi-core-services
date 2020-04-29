import fs from "fs";
import path from "path";
import {
  b64EncodeUrl,
  strB64dec,
  isTokenExpired,
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
