import {
  buildMessage,
  ValidateBy,
  isJSON,
  isHexadecimal,
  ValidationOptions,
} from "class-validator";

export const IS_HEXADECIMAL_JSON = "isHexadecimalJson";

/**
 * Checks if the string is a hexadecimal JSON.
 * If given value is not a string, then it returns false.
 */
export function isHexadecimalJson(value: unknown): boolean {
  if (typeof value !== "string" || !isHexadecimal(value)) return false;

  // Length must be even
  if (value.length % 2 !== 0) return false;

  return isJSON(
    Buffer.from(
      value.startsWith("0x") ? value.substr(2) : value,
      "hex"
    ).toString("utf8")
  );
}

/**
 * Checks if the string is a hexadecimal JSON.
 * If given value is not a string, then it returns false.
 */
export function IsHexadecimalJson(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_JSON,
      validator: {
        validate: (value) => isHexadecimalJson(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a hexadecimal JSON`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
