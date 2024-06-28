import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { ec as EC } from "elliptic";
import { calculateJwkThumbprint } from "jose";
import { bytes } from "multiformats";
import { base64url } from "multiformats/bases/base64";

export async function getEbsiIssuer(
  privateKey: string,
  did: string,
  kid?: string,
) {
  const hexIssuerPrivateKey = privateKey.replace("0x", "");
  const ec = new EC("p256");
  const pubPoint = ec.keyFromPrivate(hexIssuerPrivateKey, "hex").getPublic();
  const issuerPublicKeyJwk = {
    kty: "EC",
    crv: "P-256",
    x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
  };
  const issuerPrivateKeyJwk = {
    ...issuerPublicKeyJwk,
    d: base64url.baseEncode(bytes.fromHex(hexIssuerPrivateKey)),
  };

  const issuer: EbsiIssuer = {
    did,
    kid: kid || `${did}#${await calculateJwkThumbprint(issuerPublicKeyJwk)}`,
    alg: "ES256",
    publicKeyJwk: issuerPublicKeyJwk,
    privateKeyJwk: issuerPrivateKeyJwk,
  };
  return issuer;
}

export default getEbsiIssuer;
