import { p256 } from "@noble/curves/p256";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";
import { bytesToBase64url, hexToBytes } from "did-jwt";
import { calculateJwkThumbprint } from "jose";

export async function getPublicKeyJwk(
  privateKey: Uint8Array,
  alg: "ES256K" | "ES256" | "EdDSA",
) {
  if (alg === "ES256K") {
    const pubKeyBytes = secp256k1.getPublicKey(privateKey, false);
    const point = secp256k1.ProjectivePoint.fromHex(pubKeyBytes).toAffine();

    const jwk = {
      kty: "EC",
      crv: "secp256k1",
      x: bytesToBase64url(hexToBytes(point.x.toString(16))),
      y: bytesToBase64url(hexToBytes(point.y.toString(16))),
    } as const;

    const kid = await calculateJwkThumbprint(jwk);

    return {
      ...jwk,
      alg,
      kid,
    };
  }

  if (alg === "ES256") {
    const pubKeyBytes = p256.getPublicKey(privateKey, false);
    const point = p256.ProjectivePoint.fromHex(pubKeyBytes).toAffine();
    const jwk = {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64url(hexToBytes(point.x.toString(16))),
      y: bytesToBase64url(hexToBytes(point.y.toString(16))),
    } as const;

    const kid = await calculateJwkThumbprint(jwk);

    return {
      ...jwk,
      alg,
      kid,
    };
  }

  if (alg === "EdDSA") {
    const publicKey = ed25519.getPublicKey(privateKey);

    const jwk = {
      kty: "OKP",
      crv: "Ed25519",
      x: bytesToBase64url(publicKey),
    } as const;

    const kid = await calculateJwkThumbprint(jwk);

    return {
      ...jwk,
      alg,
      kid,
    };
  }

  throw new Error(`Unsupported algorithm ${alg as string}`);
}

export default getPublicKeyJwk;
