import { JsonWebKey } from "node:crypto";
import { ec as EC } from "elliptic";
import { base64url } from "jose";

/**
 * Transform an ES256 private key into a JWK public key.
 *
 * @param hexPrivateKey The compressed ES256 private key
 * @returns The public key as a JWK
 */
export function fromHexToJWK(hexPrivateKey: string): JsonWebKey {
  if (!hexPrivateKey || typeof hexPrivateKey !== "string") {
    throw new Error("You must provide a non-empty hexadecimal private key");
  }

  const ec = new EC("p256");

  // Get key pair from hex private key
  const keyPair = ec.keyFromPrivate(hexPrivateKey, "hex");

  // Validate key pair
  const validation = keyPair.validate();
  if (validation.result === false) {
    throw new Error(validation.reason);
  }

  // Format as JWK
  const pubPoint = keyPair.getPublic();
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x: base64url.encode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.encode(pubPoint.getY().toBuffer("be", 32)),
  };

  return jwk;
}

export default fromHexToJWK;
