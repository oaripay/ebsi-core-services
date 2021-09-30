import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { isDid } from "../utils/isDid";

export const IS_DID = "isDid";

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
