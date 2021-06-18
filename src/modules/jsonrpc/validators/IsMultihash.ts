import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { coerceCode, HashName } from "multihashes";

export const IS_MULTIHASH = "isMultihash";

export function isMultihash(value: string): boolean {
  try {
    coerceCode(value as HashName);
    return true;
  } catch (e) {
    return false;
  }
}

export function IsMultihash(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_MULTIHASH,
      validator: {
        validate: (value) => isMultihash(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid multihash`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
