import type { JsonWebKey } from "node:crypto";
import elliptic from "elliptic";
import { base64url, calculateJwkThumbprint } from "jose";
import { validateSync } from "class-validator";
import { type ClassConstructor, ClassTransformer } from "class-transformer";
import { ClassValidatorError } from "./errors/index.js";

/**
 * Transform an ES256 private key into a JWK public key.
 *
 * @param hexPrivateKey The compressed ES256 private key
 * @returns The public key as a JWK
 */
export async function fromHexToJWK(hexPrivateKey: string): Promise<JsonWebKey> {
  if (!hexPrivateKey || typeof hexPrivateKey !== "string") {
    throw new Error("You must provide a non-empty hexadecimal private key");
  }

  const EC = elliptic.ec;
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
  const jwk = {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    x: base64url.encode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.encode(pubPoint.getY().toBuffer("be", 32)),
  } satisfies JsonWebKey;

  const thumbprint = await calculateJwkThumbprint(jwk);

  return {
    ...jwk,
    kid: thumbprint,
  };
}

/**
 * Validates and transforms DTO.
 *
 * @param data The DTO to parse
 */
export function parseDto<T extends object>(
  data: unknown,
  cls: ClassConstructor<T>,
): T {
  const dataClass = new ClassTransformer().plainToInstance(cls, data);

  const errors = validateSync(dataClass, {
    stopAtFirstError: true,
  });

  if (errors.length > 0) {
    throw new ClassValidatorError(errors[0]!); // Return only the first error
  }

  return dataClass;
}
