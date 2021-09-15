import {
  isHexadecimal,
  ValidationOptions,
  ValidateBy,
  buildMessage,
  isJSON,
  isISO8601,
} from "class-validator";

export const IS_HEXADECIMAL_ADMIN_ATTRIBUTE = "isHexadecimalAdminAttribute";

/**
 * Checks if the string is a hexadecimal JSON.
 * If given value is not a string, then it returns false.
 */
export function isHexadecimalAdminAttribute(value: unknown): boolean {
  if (typeof value !== "string" || !isHexadecimal(value)) return false;

  // Length must be even
  if (value.length % 2 !== 0) return false;

  const attributeString = Buffer.from(
    value.startsWith("0x") ? value.substr(2) : value,
    "hex"
  ).toString("utf8");

  // attribute must be a JSON
  if (!isJSON(attributeString)) return false;

  const attribute = JSON.parse(attributeString) as {
    validFrom: string;
    validTo: string;
  };

  // validFrom should be defined
  if (!isISO8601(attribute.validFrom)) return false;

  // validTo is optional
  if (attribute.validTo === undefined) return true;

  return isISO8601(attribute.validTo);
}

/**
 * Checks if the string is a hexadecimal JSON.
 * If given value is not a string, then it returns false.
 */
export function IsHexadecimalAdminAttribute(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_ADMIN_ATTRIBUTE,
      validator: {
        validate: (value) => isHexadecimalAdminAttribute(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a hexadecimal JSON with a correct admin attribute format`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
