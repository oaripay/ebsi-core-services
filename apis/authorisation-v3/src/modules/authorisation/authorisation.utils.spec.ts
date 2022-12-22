import { describe, it, expect } from "@jest/globals";
import { importJWK } from "jose";
import { fromHexToJwk } from "./authorisation.utils";

describe("fromHexToJwk", () => {
  it("should return the expected valid JWK for a given private key", async () => {
    expect.assertions(2);

    const jwk = fromHexToJwk(
      "b00342c2fdf42d07cf220268a6d9dde42c44d9fdedc9845b8396b57596f2b33a"
    );

    // The JWK must match the expected output
    expect(jwk).toStrictEqual({
      crv: "P-256",
      kty: "EC",
      x: "Dwo0EeTNBL-YGCsQ3upWFVvapcx5MsHtMjk3Q3KAPqs",
      y: "KWRHbc2TXlMEngo6YfD5vJcv7c3DbsZ4g-gigDuw3AU",
    });

    // Verify that we can import the JWK in jose
    await expect(importJWK(jwk, "ES256")).resolves.not.toThrow();
  });

  it("should throw an error when the given private key is empty", () => {
    expect.assertions(1);

    expect(() => fromHexToJwk("")).toThrow(
      new Error("You must provide a non-empty hexadecimal private key")
    );
  });

  it("should throw an error when the given private key is not valid", () => {
    expect.assertions(1);

    expect(() => fromHexToJwk("0")).toThrow(new Error("Invalid public key"));
  });
});
