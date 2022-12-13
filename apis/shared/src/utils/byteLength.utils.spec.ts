import { describe, it, expect } from "@jest/globals";
import crypto from "node:crypto";
import { byteLength } from "./byteLength.utils";

describe("byteLength", () => {
  it("should return the expected byte length of a UTF8 string", () => {
    expect.assertions(1);
    expect(byteLength("test 🍻")).toBe(9);
  });

  it("should return the expected byte length of an hex string", () => {
    expect.assertions(1);
    expect(byteLength("0x1234")).toBe(2);
  });

  it("should return the byte length of a random buffer", () => {
    expect.assertions(1);
    const randomBuffer = crypto.randomBytes(16);
    expect(byteLength(randomBuffer)).toBe(16);
  });
});
