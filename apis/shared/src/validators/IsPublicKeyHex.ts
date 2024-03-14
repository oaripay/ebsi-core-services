import { KeyObject } from "node:crypto";
import { ValidateBy, ValidationOptions } from "class-validator";
import { z } from "zod";
import { isBase64 } from "validator";
import { importJWK } from "jose";
import { encode } from "../utils/encode.utils.js";
import type { ValidationResult } from "./types.js";
import { getErrorMessage } from "../utils/getErrorMessages.utils.js";

function isBase64url(value: string): boolean {
  return isBase64(value, { urlSafe: true });
}

export const IS_PUBLIC_KEY_HEX = "isPublicKeyHex";

/**
 * Public key JWK schema
 *
 * Warning: Only the required properties are accepted. Additional properties will throw an error.
 * This ensures that a user doesn't try to register a private key for instance.
 *
 * Note: the validation is quite basic at the moment. Further improvements could include:
 * - validating the length (in bytes) of the "x" and "y" parameters based on the curve
 *
 * @see https://www.rfc-editor.org/rfc/rfc7517
 */
export const jwkSchema = z.discriminatedUnion("kty", [
  /**
   * Elliptic Curve keys
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2
   */
  z
    .object({
      /**
       * "kty" (Key Type) Parameter
       *
       * The "kty" (key type) parameter identifies the cryptographic algorithm family used with the
       * key.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7517#section-4.1
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.1
       */
      kty: z.literal("EC"),

      /**
       * "crv" (Curve) Parameter
       *
       * The "crv" (curve) parameter identifies the cryptographic curve used with the key.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.1.1
       * @see https://www.rfc-editor.org/rfc/rfc8812#section-3
       */
      crv: z.union([
        z.literal("P-256"),
        z.literal("P-384"),
        z.literal("P-521"),
        z.literal("secp256k1"),
      ]),

      /**
       * "x" (X Coordinate) Parameter
       *
       * The "x" (x coordinate) parameter contains the x coordinate for the Elliptic Curve point. It
       * is represented as the base64url encoding of the octet string representation of the
       * coordinate.  The length of this octet string MUST be the full size of a coordinate for the
       * curve specified in the "crv" parameter.  For example, if the value of "crv" is "P-521", the
       * octet string must be 66 octets long.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.1.2
       */
      x: z.string().refine(isBase64url),

      /**
       * "y" (Y Coordinate) Parameter
       *
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.2.1.3
       */
      y: z.string().refine(isBase64url),
    })
    .strict(),

  /**
   * RSA keys
   *
   * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3
   */
  z
    .object({
      /**
       * "kty" (Key Type) Parameter
       *
       * The "kty" (key type) parameter identifies the cryptographic algorithm family used with the
       * key.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7517#section-4.1
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.1
       */
      kty: z.literal("RSA"),

      /**
       * "n" (Modulus) Parameter
       *
       * The "n" (modulus) parameter contains the modulus value for the RSA public key. It is
       * represented as a Base64urlUInt-encoded value.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.1.1
       */
      n: z.string().refine(isBase64url),

      /**
       * "e" (Exponent) Parameter
       *
       * The "e" (exponent) parameter contains the exponent value for the RSA public key. It is
       * represented as a Base64urlUInt-encoded value.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.3.1.2
       */
      e: z.string().refine(isBase64url),
    })
    .strict(),

  /**
   * EdDSA keys
   *
   * @see https://www.rfc-editor.org/rfc/rfc8032.html
   * @see https://www.rfc-editor.org/rfc/rfc8037#section-2
   */
  z
    .object({
      /**
       * "kty" (Key Type) Parameter
       *
       * The "kty" (key type) parameter identifies the cryptographic algorithm family used with the
       * key.
       *
       * @see https://www.rfc-editor.org/rfc/rfc7517#section-4.1
       * @see https://www.rfc-editor.org/rfc/rfc7518#section-6.1
       * @see https://www.rfc-editor.org/rfc/rfc8037#section-2
       */
      kty: z.literal("OKP"),

      /**
       * "crv" (Curve) Parameter
       *
       * The "crv" (curve) parameter identifies the cryptographic curve used with the key.
       *
       * @see https://www.rfc-editor.org/rfc/rfc8037#section-3.1
       * @see https://www.rfc-editor.org/rfc/rfc8037#section-3.2
       */
      crv: z.union([
        z.literal("Ed25519"),
        z.literal("Ed448"),
        z.literal("X25519"),
        z.literal("X448"),
      ]),

      /**
       * "x" (Public Key) Parameter
       *
       * The parameter "x" MUST be present and contain the public key encoded using the base64url
       * encoding.
       *
       * @see https://www.rfc-editor.org/rfc/rfc8037#section-2
       */
      x: z.string().refine(isBase64url),
    })
    .strict(),
]);

export function getPublicKeyJwk(value: unknown, isSecp256k1: boolean) {
  if (typeof value !== "string") {
    throw new Error("The public key must be a string");
  }

  if (!/^0x[0-9A-F]+$/i.test(value)) {
    throw new Error(
      "The public key must be an hexadecimal string prefixed with 0x",
    );
  }

  const publicKey = value.replace("0x", "");

  if (publicKey.length % 2 !== 0) {
    throw new Error("The public key must be an even number of bytes");
  }

  if (isSecp256k1) {
    // The key must either be 64 bytes or 65 bytes with "04" prefix
    if (
      publicKey.length === 128 ||
      (publicKey.startsWith("04") && publicKey.length === 130)
    ) {
      return encode.publicKey.fromHexToJWK(publicKey);
    }

    throw new Error(
      "The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
    );
  }

  let parsedObject: unknown;

  try {
    parsedObject = JSON.parse(Buffer.from(publicKey, "hex").toString());
  } catch (error) {
    throw new Error("The public key must be valid JSON object");
  }

  if (typeof parsedObject !== "object" || parsedObject === null) {
    throw new Error("The public key must be an object");
  }

  const parsingResult = jwkSchema.safeParse(parsedObject);
  if (!parsingResult.success) {
    throw parsingResult.error;
  }

  const jwk = parsingResult.data;

  return jwk;
}

export async function isPublicKeyHex(
  value: unknown,
  isSecp256k1: boolean,
): Promise<ValidationResult> {
  let jwk: ReturnType<typeof getPublicKeyJwk>;
  try {
    jwk = getPublicKeyJwk(value, isSecp256k1);
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }

  if (isSecp256k1) {
    // No need to validate the JWK in case of secp256k1
    return { success: true };
  }

  try {
    const key = await importJWK(jwk, undefined, true);

    if (!(key instanceof KeyObject)) {
      throw new Error();
    }

    if (key.type !== "public") {
      throw new Error("The key is not a public key");
    }
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "The public key is not a valid JWK"),
    };
  }

  return { success: true };
}

export function IsPublicKeyHex(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_PUBLIC_KEY_HEX,
      validator: {
        validate: async (value, args) => {
          if (
            !args ||
            !("isSecp256k1" in args.object) ||
            typeof args.object.isSecp256k1 !== "boolean"
          ) {
            return false;
          }

          return (await isPublicKeyHex(value, args.object.isSecp256k1)).success;
        },
      },
    },
    {
      message: (args) => {
        try {
          const { isSecp256k1 } = args.object as { isSecp256k1: boolean };
          getPublicKeyJwk(args.value, isSecp256k1);
          return "Invalid public key";
        } catch (error) {
          return `Invalid public key. ${getErrorMessage(error)}`;
        }
      },
      ...validationOptions,
    },
  );
}
