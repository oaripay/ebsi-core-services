import {
  buildMessage,
  ValidateBy,
  isHexadecimal,
  ValidationOptions,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from "class-validator";
import { canonize } from "jsonld";

export const IS_HEXADECIMAL_JSON_LD = "isHexadecimalJsonLd";

/**
 * Checks if the string is a URDNA2015-serialized JSON-LD encoded in hexadecimal.
 * If given value is not a string, then it returns false.
 */
export async function isHexadecimalJsonLd(value: unknown): Promise<boolean> {
  if (typeof value !== "string" || !isHexadecimal(value)) return false;

  // Must start with 0x
  if (!value.startsWith("0x")) return false;

  // Length must be even
  if (value.length % 2 !== 0) return false;

  try {
    const doc = JSON.parse(
      Buffer.from(value.substr(2), "hex").toString("utf8")
    ) as { [x: string]: unknown };

    // Try to canonize it
    const canonized = await canonize(doc, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
    });

    // Reject if we get a falsy value (like an empty string)
    return !!canonized;
  } catch (e) {
    return false;
  }
}

@ValidatorConstraint({ async: true })
export class IsHexadecimalJsonLdConstraint
  implements ValidatorConstraintInterface {
  validate(value: unknown): Promise<boolean> {
    return isHexadecimalJsonLd(value);
  }

  defaultMessage = buildMessage(
    (eachPrefix) =>
      `${eachPrefix}$property must be a JSON-LD encoded in hexadecimal`
  );
}

/**
 * Checks if the string is a URDNA2015-serialized JSON-LD encoded in hexadecimal.
 * If given value is not a string, then it returns false.
 */
export function IsHexadecimalJsonLd(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_HEXADECIMAL_JSON_LD,
      validator: IsHexadecimalJsonLdConstraint,
    },
    validationOptions
  );
}
