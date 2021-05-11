import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";

export const IS_DID = "isDid";

export function isDid(value: string): boolean {
  return (
    typeof value === "string" &&
    value.split(":").length >= 3 &&
    value.substring(0, 4) === "did:"
  );
}

export function IsDid(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DID,
      validator: {
        validate: (value) => isDid(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
