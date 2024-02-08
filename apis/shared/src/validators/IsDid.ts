import {
  registerDecorator,
  buildMessage,
  ValidationOptions,
} from "class-validator";
import { EBSI_DID_METHOD_PREFIX, validate } from "@cef-ebsi/ebsi-did-resolver";
import { util } from "@cef-ebsi/key-did-resolver";
import type { ValidationResult } from "./types.js";

export function isDid(value: unknown): ValidationResult {
  if (!value || typeof value !== "string")
    return { success: false, error: "must be a valid DID string" };

  try {
    if (value.startsWith(EBSI_DID_METHOD_PREFIX)) {
      validate(value);
    } else {
      util.validateDid(value);
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

export function IsDid(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: "isDid",
      target: object.constructor,
      propertyName,
      validator: {
        validate: (value) => isDid(value).success,
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID string`,
          validationOptions,
        ),
      },
    });
  };
}

export default IsDid;
