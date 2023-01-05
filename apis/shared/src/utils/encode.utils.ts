import { JsonWebKey } from "node:crypto";
import { ec as EC } from "elliptic";
import { bases } from "multiformats/basics";

const { base64url } = bases;
const ec = new EC("secp256k1");

export function publicKeyfromHexToJWK(keyHex: string): JsonWebKey {
  const hex = keyHex.replace("0x", "");
  const pubPoint = ec.keyFromPublic(hex, "hex").getPublic();
  return {
    kty: "EC",
    crv: "secp256k1",
    x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
  };
}

export default publicKeyfromHexToJWK;
