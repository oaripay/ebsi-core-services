import { describe, expect, it } from "vitest";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import { exportJWK, generateKeyPair } from "jose";
import { didToHex, hexToDid } from "./utils.js";

describe("hexToDid", () => {
  it("should throw an error if the input can not be converted to a DID", () => {
    expect.assertions(1);

    expect(() => hexToDid("")).toThrow(
      // Note: this error is returned by bn.js after we call elliptic's KeyPair.getPublic method
      new Error("Cannot read properties of null (reading '-1')"),
    );
  });

  it("should return the expected did:ebsi DID", () => {
    expect.assertions(1);

    const did = EbsiWallet.createDid();

    expect(hexToDid(`0x${Buffer.from(did).toString("hex")}`)).toStrictEqual(
      did,
    );
  });

  it("should return the expected did:key DID", async () => {
    expect.assertions(1);

    // Create random did:key DID
    const { publicKey } = await generateKeyPair("ES256K");
    const publicKeyJwk = await exportJWK(publicKey);
    const did = EbsiWallet.createDid("NATURAL_PERSON", publicKeyJwk);

    const publicKeyHex = encode.publicKey.fromJWKToHex(publicKeyJwk);
    const didBuffer = Buffer.from(publicKeyHex, "hex");

    expect(hexToDid(`0x${didBuffer.toString("hex")}`)).toStrictEqual(did);
  });
});

describe("didToHex", () => {
  it("should reject did:key with a curve different to secp256k1", async () => {
    expect.assertions(1);

    const { publicKey } = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(publicKey);
    const did = EbsiWallet.createDid("NATURAL_PERSON", publicKeyJwk);

    await expect(didToHex(did)).rejects.toThrow(
      `The did ${did} must use secp256k1 curve. Received: P-256`,
    );
  });

  it("should return the expected hex for a did:ebsi", async () => {
    expect.assertions(1);

    const did = EbsiWallet.createDid();

    await expect(didToHex(did)).resolves.toBe(
      `0x${Buffer.from(did).toString("hex")}`,
    );
  });

  it("should return the expected hex for a did:key", async () => {
    // Create random did:key DID
    const { publicKey } = await generateKeyPair("ES256K");
    const publicKeyJwk = await exportJWK(publicKey);
    const did = EbsiWallet.createDid("NATURAL_PERSON", publicKeyJwk);

    const publicKeyHex = encode.publicKey.fromJWKToHex(publicKeyJwk);
    const didBuffer = Buffer.from(publicKeyHex, "hex");

    await expect(didToHex(did)).resolves.toBe(`0x${didBuffer.toString("hex")}`);
  });
});
