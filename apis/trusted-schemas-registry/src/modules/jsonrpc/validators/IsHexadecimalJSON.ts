import {
  buildMessage,
  ValidateBy,
  isJSON,
  isHexadecimal,
  ValidationOptions,
} from "class-validator";
import { remove0xPrefix } from "@ebsiint-api/shared";

export const IS_HEXADECIMAL_JSON = "isHexadecimalJSON";

/**
 * Checks if the string is a hexadecimal JSON.
 * If given value is not a string, then it returns false.
 */
export function isHexadecimalJSON(value: unknown): boolean {
  if (typeof value !== "string" || !isHexadecimal(value)) return false;

  // Length must be even
  if (value.length % 2 !== 0) return false;

  return isJSON(Buffer.from(remove0xPrefix(value), "hex").toString("utf8"));
}

/**
 * Checks if the string is a hexadecimal JSON.
 * If given value is not a string, then it returns false.
 */
export function IsHexadecimalJSON(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_JSON,
      validator: {
        validate: (value) => isHexadecimalJSON(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a hexadecimal JSON`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
