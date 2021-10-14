import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { isHexadecimalJson } from "./IsHexadecimalJson";
import { isDid, isDidDocument } from "../../../shared/validators";

export const IS_HEXADECIMAL_JSON_LD_DID_DOCUMENT =
  "isHexadecimalJsonLdDidDocument";

/**
 * Checks if the string is a JSON-LD DID document encoded in hexadecimal.
 */
export function isHexadecimalJsonLdDidDocument(value: unknown): boolean {
  if (!isHexadecimalJson(value)) return false;

  try {
    const didDocument = JSON.parse(
      Buffer.from(
        value.startsWith("0x") ? value.substr(2) : value,
        "hex"
      ).toString("utf8")
    ) as { [x: string]: unknown };

    // JSON-LD DID document MUST be a valid DID document
    if (!didDocument || !isDidDocument(didDocument)) return false;

    // JSON-LD DID document "id" property MUST be a DID. (currently not checked by the validator)
    if (!isDid(didDocument.id)) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if the string is a JSON-LD DID document encoded in hexadecimal.
 */
export function IsHexadecimalJsonLdDidDocument(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_JSON_LD_DID_DOCUMENT,
      validator: {
        validate: (value) => isHexadecimalJsonLdDidDocument(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a DID document encoded in hexadecimal`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
