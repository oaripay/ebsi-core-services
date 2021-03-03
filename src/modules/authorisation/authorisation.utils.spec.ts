import { ethers } from "ethers";
import { decrypt, encrypt, getPublicKeyHex } from "./authorisation.utils";
import { createKeys } from "../../../tests/utils/publicKey";

describe("Utils", () => {
  it("should get the public key hex", () => {
    expect.assertions(1);
    const appPrivateKey =
      "0xbba54f4bfd84afc6a8b0724b7ce2684034933f696ff57213c1e7b2140015c757";
    const appPublicKey =
      "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUV6a1ozSktaR0pIL2l0dkRzVlVvbHkvekVGNURvOWxBTgptVG1uc3J6aEtHMWhxM2xEdU9qRVIwOUxWYTZQSFRvK3dhNW9aN2llZW1QaFhxQzF1YkFrMHc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0K";
    const wallet = new ethers.Wallet(appPrivateKey);
    const publicKeyHex = getPublicKeyHex(appPublicKey);
    expect(publicKeyHex).toBe(wallet.publicKey.slice(2));
  });

  it("should encrypt a message + nonce using the public key of the recipient", async () => {
    expect.assertions(1);
    const { privateKey, publicKey } = await createKeys();
    const { publicKeyPem } = publicKey;
    const publicKeyApiPemBase64 = Buffer.from(publicKeyPem).toString("base64");

    const message = "this is the access token";
    const nonce = "this is a nonce provided by the user";
    const privateKeyRecipient =
      "0xbba54f4bfd84afc6a8b0724b7ce2684034933f696ff57213c1e7b2140015c757";
    const publicKeyRecipient =
      "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUV6a1ozSktaR0pIL2l0dkRzVlVvbHkvekVGNURvOWxBTgptVG1uc3J6aEtHMWhxM2xEdU9qRVIwOUxWYTZQSFRvK3dhNW9aN2llZW1QaFhxQzF1YkFrMHc9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0K";
    const encrypted = await encrypt(
      privateKey,
      message,
      nonce,
      publicKeyRecipient
    );

    // decrypt
    const messageRecovered = await decrypt(
      privateKeyRecipient,
      encrypted,
      nonce,
      publicKeyApiPemBase64
    );
    expect(messageRecovered).toBe(message);
  });
});
