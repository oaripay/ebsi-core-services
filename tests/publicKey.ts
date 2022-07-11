import crypto from "crypto";
import { ethers } from "hardhat";
import { jwtVerify } from "jose";
import { createJWT, ES256KSigner } from "did-jwt";
import { expect } from "chai";
import { getPublicKey } from "../utils/publicKey";

describe("Utils - Get Public Key", () => {
  it("should generate a public key that can be used to verify a signature", async () => {
    const privateKey = crypto.randomBytes(32);
    const wallet = new ethers.Wallet(`0x${privateKey.toString("hex")}`);
    const did = `did:ebsi:${wallet.address}`;
    const payload = { test: "test payload" };
    const token = await createJWT(payload, {
      alg: "ES256K",
      issuer: did,
      signer: ES256KSigner(privateKey),
    });

    const { publicKeyObject } = await getPublicKey(privateKey.toString("hex"));
    const result = await jwtVerify(token, publicKeyObject);
    expect(result.payload).to.deep.include(payload);
  });
});
