import { ValidateBy, ValidationOptions, buildMessage } from "class-validator";
import {
  CUSTOM_SCOPES,
  OPENID_SCOPE,
  SUPPORTED_SCOPES,
} from "../authorisation.constants";

export const IS_SCOPE = "isScope";

export function isScope(value: unknown): boolean {
  // "scope" must be a non-empty array
  if (!Array.isArray(value) || value.length <= 0) {
    return false;
  }

  // The scope must contain 2 unique items ("openid" + any other valid scope)
  if (new Set(value).size !== 2) {
    return false;
  }

  // "openid" must be present
  if (!value.includes(OPENID_SCOPE)) {
    return false;
  }

  // Each value must be one of the supported scopes
  return value.every(
    (val) => typeof val === "string" && SUPPORTED_SCOPES.includes(val)
  );
}

export function IsScope(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_SCOPE,
      validator: {
        validate: (value) => isScope(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a combination of '${OPENID_SCOPE}' and one of the supported scopes ('${CUSTOM_SCOPES.join(
              "', '"
            )}')`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
