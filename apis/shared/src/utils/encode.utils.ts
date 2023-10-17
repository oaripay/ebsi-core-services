import elliptic from "elliptic";
import { KeyEncoder } from "@cef-ebsi/key-encoder";
import { bases, bytes } from "multiformats/basics";
import { JWK } from "jose";

const { base64url } = bases;
const EC = elliptic.ec;
const ec = new EC("secp256k1");

const keyEncoder = new KeyEncoder("secp256k1");

export const encode = {
  publicKey: {
    fromJWKToHex: (keyJwk: JWK): string => {
      return ec
        .keyFromPublic({
          x: bytes.toHex(base64url.baseDecode(keyJwk.x || "")),
          y: bytes.toHex(base64url.baseDecode(keyJwk.y || "")),
        })
        .getPublic("hex");
    },
    fromHexToJWK: (keyHex: string): JWK => {
      const hex = keyHex.replace("0x", "");
      const pubPoint = ec.keyFromPublic(hex, "hex").getPublic();
      return {
        kty: "EC",
        crv: "secp256k1",
        x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
        y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
      };
    },
    fromJWKToPEM: (keyJwk: JWK): string => {
      const keyHex = ec
        .keyFromPublic({
          x: bytes.toHex(base64url.baseDecode(keyJwk.x || "")),
          y: bytes.toHex(base64url.baseDecode(keyJwk.y || "")),
        })
        .getPublic("hex");
      return keyEncoder.encodePublic(keyHex, "raw", "pem");
    },
  },
  privateKey: {
    fromJWKToHex: (keyJwk: JWK): string => {
      return bytes.toHex(base64url.baseDecode(keyJwk.d || ""));
    },
    fromHexToJWK: (keyHex: string): JWK => {
      const hex = keyHex.replace("0x", "");
      const pubPoint = ec.keyFromPrivate(hex, "hex").getPublic();
      return {
        kty: "EC",
        crv: "secp256k1",
        x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
        y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
        d: base64url.baseEncode(bytes.fromHex(hex)),
      };
    },
  },
};

export default encode;
