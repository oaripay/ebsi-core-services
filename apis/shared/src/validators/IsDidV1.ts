import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { validate } from "@cef-ebsi/ebsi-did-resolver";

export const IS_DID_V1 = "isDidV1";

export function isDidV1(value: unknown): boolean {
  try {
    const didVersion = validate(value as string);
    return didVersion === 1;
  } catch (error) {
    return false;
  }
}

export function IsDidV1(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DID_V1,
      validator: {
        validate: (value) => isDidV1(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID v1`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
