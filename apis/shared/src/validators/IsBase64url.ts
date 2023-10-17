import {
  ValidateBy,
  type ValidationOptions,
  buildMessage,
} from "class-validator";

export const IS_BASE64URL = "isBase64url";

const notBase64url = /[^A-Z0-9-_=]/i;
export function isBase64url(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const len = value.length;
  if (notBase64url.test(value)) {
    return false;
  }

  const firstPaddingChar = value.indexOf("=");
  return (
    firstPaddingChar === -1 ||
    firstPaddingChar === len - 1 ||
    (firstPaddingChar === len - 2 && value[len - 1] === "=")
  );
}

export function IsBase64url(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_BASE64URL,
      validator: {
        validate: (value) => isBase64url(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be base64url encoded`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
