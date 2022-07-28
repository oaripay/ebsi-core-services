import { validate } from "@cef-ebsi/ebsi-did-resolver";
import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";

export const IS_DID = "isDid";

export function isDid(value: string): boolean {
  try {
    validate(value);
    return true;
  } catch (error) {
    return false;
  }
}

export function IsDid(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DID,
      validator: {
        validate: isDid,
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
