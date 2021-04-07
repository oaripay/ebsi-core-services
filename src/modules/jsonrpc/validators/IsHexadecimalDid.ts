import {
  buildMessage,
  ValidateBy,
  isHexadecimal,
  ValidationOptions,
} from "class-validator";
import { isDid } from "../../../shared/validators";

export const IS_HEXADECIMAL_DID = "isHexadecimalDid";

/**
 * Checks if the string is an hexadecimal DID.
 * If given value is not a string, then it returns false.
 */
export function isHexadecimalDid(value: unknown): boolean {
  if (typeof value !== "string" || !isHexadecimal(value)) return false;

  // Must start with 0x
  if (!value.startsWith("0x")) return false;

  // Length must be even
  if (value.length % 2 !== 0) return false;

  const utf8Value = Buffer.from(value.substr(2), "hex").toString("utf8");

  // It must be a DID, i.e "did:xxx:xxx"
  if (!isDid(utf8Value)) return false;

  // TODO: check in DID Registry if the method ("did:xxx") is registered

  // Note: we simplify the validation rule because not all the DID we support must start with did:ebsi,
  // nor must they contain 32 bytes encoded in base58
  return true;
}

/**
 * Checks if the string is an hexadecimal DID.
 * If given value is not a string, then it returns false.
 */
export function IsHexadecimalDid(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_DID,
      validator: {
        validate: (value) => isHexadecimalDid(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid DID encoded in hexadecimal`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
