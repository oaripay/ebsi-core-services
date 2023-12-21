import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { calculateJwkThumbprint } from "jose";
import { getPublicKeyJwk } from "./IsPublicKeyHex.js";
import type { ValidationResult } from "./types.js";

export const IS_VERIFICATION_METHOD_ID = "isVerificationMethodId";

export async function isVerificationMethodId(
  value: unknown,
  isSecp256k1: boolean,
  publicKey: string,
): Promise<ValidationResult> {
  try {
    const publicKeyJwk = getPublicKeyJwk(publicKey, isSecp256k1);
    const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

    if (value === thumbprint) {
      return { success: true };
    }

    return {
      success: false,
      error: `vMethodId must be the thumbprint of the publicKey`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid vMethodId: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}

export function IsVerificationMethodId(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_VERIFICATION_METHOD_ID,
      validator: {
        validate: async (value, args) => {
          if (!args) return false;

          const { publicKey, isSecp256k1 } = args.object as {
            isSecp256k1: boolean;
            publicKey: string;
          };

          return (await isVerificationMethodId(value, isSecp256k1, publicKey))
            .success;
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be the thumbprint of the publicKey`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
