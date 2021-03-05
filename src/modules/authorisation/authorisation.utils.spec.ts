import crypto from "crypto";
import { ethers } from "ethers";
import {
  decrypt,
  encrypt,
  getPrivateKeyHex,
  getPublicKeyHex,
  generateKeys,
} from "./authorisation.utils";

describe("Utils", () => {
  it("should get the private key hex and public key hex", async () => {
    expect.assertions(2);
    const { publicKey, privateKey } = await generateKeys("ES256K");
    const privateKeyHex = await getPrivateKeyHex(privateKey);
    const publicKeyHex = getPublicKeyHex(publicKey);
    const wallet = new ethers.Wallet(`0x${privateKeyHex}`);

    expect(privateKeyHex).toHaveLength(64);
    expect(publicKeyHex).toBe(wallet.publicKey.slice(2));
  });

  describe.each(["ES256K", "ES256", "RS256", "EdDSA"])("Alg %s", (alg) => {
    it("should encrypt an message + nonce using the public key of the client", async () => {
      expect.assertions(1);
      const keys = await generateKeys(alg);
      let publicKey: crypto.KeyObject;
      let privateKey: crypto.KeyObject;

      if (alg === "EdDSA") {
        publicKey = keys.publicKeyEncryption;
        privateKey = keys.privateKeyEncryption;
      } else {
        publicKey = keys.publicKey;
        privateKey = keys.privateKey;
      }
      const payload = { test: "test" };
      const encrypted = await encrypt(alg, payload, publicKey);

      // decrypt
      const payloadDecrypted = await decrypt(alg, privateKey, encrypted);
      expect(payloadDecrypted).toStrictEqual(payload);
    });
  });
});
