import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { calculateJwkThumbprint } from "jose";
import { getPublicKeyJwk } from "./IsPublicKeyHex.js";

export const IS_VERIFICATION_METHOD_ID = "isVerificationMethodId";

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
          try {
            const publicKeyJwk = getPublicKeyJwk(publicKey, isSecp256k1);
            const thumbprint = await calculateJwkThumbprint(publicKeyJwk);
            return value === thumbprint;
          } catch (error) {
            return false;
          }
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
