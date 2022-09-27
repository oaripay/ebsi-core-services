import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { isDidV1 } from "../utils";

export const IS_DID_V1 = "isDidV1";

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
