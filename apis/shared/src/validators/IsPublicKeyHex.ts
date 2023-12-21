import { ValidateBy, ValidationOptions } from "class-validator";
import { JWK } from "jose";
import { encode } from "../utils/encode.utils.js";
import type { ValidationResult } from "./types.js";

export const IS_PUBLIC_KEY_HEX = "isPublicKeyHex";

export function getPublicKeyJwk(value: unknown, isSecp256k1: boolean): JWK {
  if (typeof value !== "string") {
    throw new Error("The public key must be a string");
  }
  const publicKey = value.replace("0x", "");

  if (isSecp256k1) {
    if (publicKey.length !== 66 && publicKey.length !== 130) {
      throw new Error(
        "The public key must be of 33 bytes (secp256k1 compressed) or 65 bytes (secp256k1 uncompressed)",
      );
    }

    return encode.publicKey.fromHexToJWK(publicKey);
  }

  return JSON.parse(Buffer.from(publicKey, "hex").toString()) as JWK;
}

export function isPublicKeyHex(
  value: unknown,
  isSecp256k1: boolean,
): ValidationResult {
  try {
    getPublicKeyJwk(value, isSecp256k1);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export function IsPublicKeyHex(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_PUBLIC_KEY_HEX,
      validator: {
        validate: (value, args) => {
          if (
            !args ||
            !("isSecp256k1" in args.object) ||
            typeof args.object.isSecp256k1 !== "boolean"
          ) {
            return false;
          }

          return isPublicKeyHex(value, args.object.isSecp256k1).success;
        },
      },
    },
    {
      message: (args) => {
        try {
          const { isSecp256k1 } = args.object as { isSecp256k1: boolean };
          getPublicKeyJwk(args.value, isSecp256k1);
          return "";
        } catch (error) {
          return `Invalid public key. ${(error as Error).message}`;
        }
      },
      ...validationOptions,
    },
  );
}
