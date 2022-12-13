import { describe, it, expect } from "@jest/globals";
import { encrypt, decrypt } from "./crypto.utils";

describe("crypto utils", () => {
  const secret = "secret passphrase";

  it("should encrypt/decrypt a text", () => {
    expect.assertions(1);

    const initialText = "test";
    const encryptedText = encrypt(initialText, secret);

    expect(decrypt(encryptedText, secret)).toStrictEqual(initialText);
  });

  it("should always return different hashes", () => {
    expect.assertions(1);

    const initialText = "test";
    const encryptedText = encrypt(initialText, secret);
    const encryptedText2 = encrypt(initialText, secret);

    expect(encryptedText).not.toStrictEqual(encryptedText2);
  });
});
