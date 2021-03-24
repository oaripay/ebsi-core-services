import {
  buildMessage,
  ValidateBy,
  isHexadecimal,
  ValidationOptions,
} from "class-validator";
import * as bs58 from "bs58";
import { isDid } from "./IsDid";

export const IS_HEXADECIMAL_BASE58_EBSI_DID = "isHexadecimalBase58EbsiDid";

/**
 * Checks if the string is a hexadecimal base58 EBSI DID.
 * If given value is not a string, then it returns false.
 */
export function isHexadecimalBase58EbsiDid(value: unknown): boolean {
  if (typeof value !== "string" || !isHexadecimal(value)) return false;

  // Must start with 0x
  if (!value.startsWith("0x")) return false;

  // Length must be even
  if (value.length % 2 !== 0) return false;

  const utf8Value = Buffer.from(value.substr(2), "hex").toString("utf8");

  // It must be a DID, i.e "did:xxx:xxx"
  if (!isDid(utf8Value)) return false;

  const segments = utf8Value.split(":");

  // Second segment of the DID must be "ebsi"
  if (segments[1] !== "ebsi") return false;

  // Third segment must be encoded in base58 and be 32-bytes long
  try {
    const decodedString = bs58.decode(segments[2]);
    return Buffer.from(decodedString).byteLength === 32;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if the string is a hexadecimal base58 EBSI DID.
 * If given value is not a string, then it returns false.
 */
export function IsHexadecimalBase58EbsiDid(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_BASE58_EBSI_DID,
      validator: {
        validate: (value) => isHexadecimalBase58EbsiDid(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a base58 EBSI DID encoded in hexadecimal`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
