import { ValidateBy, ValidationOptions } from "class-validator";
import { JWK } from "jose";
import { publicKeyFromHexToJwk } from "../utils/encode.utils";

export const IS_PUBLIC_KEY_HEX = "isPublicKeyHex";

export function getPublicKeyJwk(value: unknown, isSecp256k1: boolean): JWK {
  if (typeof value !== "string") {
    throw new Error("Validation error: The public key must be a string");
  }
  const publicKey = value.replace("0x", "");

  if (isSecp256k1) {
    if (publicKey.length !== 66 && publicKey.length !== 130) {
      throw new Error(
        `Validation error: The public key must be of 33 bytes (secp256k1 compressed) or 65 bytes (secp256k1 uncompressed)`
      );
    }

    try {
      return publicKeyFromHexToJwk(publicKey);
    } catch (error) {
      throw new Error(
        `Validation error: Invalid public key. ${(error as Error).message}`
      );
    }
  }

  try {
    return JSON.parse(Buffer.from(publicKey, "hex").toString()) as JWK;
  } catch (error) {
    throw new Error(
      `Validation error: Invalid public key. ${(error as Error).message}`
    );
  }
}

export function IsPublicKeyHex(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_PUBLIC_KEY_HEX,
      validator: {
        validate: (value, args) => {
          try {
            getPublicKeyJwk(
              value,
              (args.object as { isSecp256k1: boolean }).isSecp256k1
            );
            return true;
          } catch (error) {
            return false;
          }
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
          return (error as Error).message;
        }
      },
      ...validationOptions,
    }
  );
}
