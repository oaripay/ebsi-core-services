import { validate } from "@cef-ebsi/ebsi-did-resolver";
import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";

export const IS_DID_V1 = "isDidV1";

export function isDidV1(value: string): boolean {
  try {
    const didVersion = validate(value);
    return didVersion === 1;
  } catch (error) {
    return false;
  }
}

export function IsDidV1(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DID_V1,
      validator: {
        validate: isDidV1,
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID v1`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
