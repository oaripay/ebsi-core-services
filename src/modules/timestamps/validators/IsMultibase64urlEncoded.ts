import { ValidateBy, ValidationOptions, buildMessage } from "class-validator";
import { multibase64Decode } from "../timestamps.utils";

export const IS_MULTIBASE64URL_ENCODED = "isMultibase64urlEncoded";

export function isMultibase64urlEncoded(value: unknown): boolean {
  if (typeof value !== "string") return false;

  try {
    multibase64Decode(value);
    // TODO: check if the value is a valid multihash??
    return true;
  } catch (e) {
    return false;
  }
}

export function IsMultibase64urlEncoded(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_MULTIBASE64URL_ENCODED,
      validator: {
        validate: (value) => isMultibase64urlEncoded(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be multi-base64url encoded`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
