import crypto from "crypto";
import { ethers } from "hardhat";
import jwtVerify from "jose/jwt/verify";
import { createJwt, SimpleSigner } from "@cef-ebsi/did-jwt";
import { expect } from "chai";
import { getPublicKey } from "../utils/publicKey";

describe("Utils - Get Public Key", () => {
  it("should generate a public key that can be used to verify a signature", async () => {
    const privateKey = crypto.randomBytes(32).toString("hex");
    const wallet = new ethers.Wallet(`0x${privateKey}`);
    const did = `did:ebsi:${wallet.address}`;
    const payload = { test: "test payload" };
    const token = await createJwt(payload, {
      alg: "ES256K",
      issuer: did,
      signer: SimpleSigner(privateKey),
    });

    const { publicKeyObject } = await getPublicKey(privateKey);
    const result = await jwtVerify(token, publicKeyObject);
    expect(result.payload).to.deep.include(payload);
  });
});
