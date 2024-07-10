import { describe, it, expect } from "vitest";
import { type JWK, importJWK } from "jose";
import { fromHexToJWK } from "./authorisation.utils.js";

describe("fromHexToJWK", () => {
  it("should return the expected valid JWK for a given private key", async () => {
    expect.assertions(2);

    const jwk = await fromHexToJWK(
      "b00342c2fdf42d07cf220268a6d9dde42c44d9fdedc9845b8396b57596f2b33a",
    );

    // The JWK must match the expected output
    expect(jwk).toStrictEqual({
      crv: "P-256",
      kty: "EC",
      alg: "ES256",
      x: "Dwo0EeTNBL-YGCsQ3upWFVvapcx5MsHtMjk3Q3KAPqs",
      y: "KWRHbc2TXlMEngo6YfD5vJcv7c3DbsZ4g-gigDuw3AU",
      kid: "O4Uy7Kq1UpeFknoBam3cwhGpVnzgYRvdqIaLzOKM2O8",
    });

    // Verify that we can import the JWK in jose
    await expect(importJWK(jwk as JWK)).resolves.not.toThrow();
  });

  it("should throw an error when the given private key is empty", async () => {
    expect.assertions(1);

    await expect(async () => fromHexToJWK("")).rejects.toThrow(
      new Error("You must provide a non-empty hexadecimal private key"),
    );
  });

  it("should throw an error when the given private key is not valid", async () => {
    expect.assertions(1);

    await expect(async () => fromHexToJWK("0")).rejects.toThrow(
      new Error("Invalid public key"),
    );
  });
});
