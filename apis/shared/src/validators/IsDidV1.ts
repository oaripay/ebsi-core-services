import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { validate } from "@cef-ebsi/ebsi-did-resolver";
import type { ValidationResult } from "./types.js";

export const IS_DID_V1 = "isDidV1";

export function isDidV1(value: unknown): ValidationResult {
  try {
    validate(value as string); // EBSI DID method v2 is not supported by the lib any more.
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export function IsDidV1(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_DID_V1,
      validator: {
        validate: (value) => isDidV1(value).success,
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID v1`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
