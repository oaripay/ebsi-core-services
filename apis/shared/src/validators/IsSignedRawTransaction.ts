import type { ValidationOptions } from "class-validator";

import { buildMessage, ValidateBy } from "class-validator";

import type { ValidationResult } from "./types.ts";

export const IS_SIGNED_RAW_TRANSACTION = "isSignedRawTransaction";

export function isSignedRawTransaction(value: unknown): ValidationResult {
  if (typeof value !== "string" || value === "" || !value.startsWith("0x")) {
    return {
      error: "signedRawTransaction must be an hexadecimal string",
      success: false,
    };
  }

  const firstByte = Number.parseInt(value.slice(0, 4), 16);

  if (firstByte >= 0xc0) {
    return { success: true };
  }

  return {
    error: "Only type 0 (legacy) transactions are supported",
    success: false,
  };
}

export function IsSignedRawTransaction(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_SIGNED_RAW_TRANSACTION,
      validator: {
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a type 0 (legacy) transaction`,
          validationOptions,
        ),
        validate: (val) => isSignedRawTransaction(val).success,
      },
    },
    validationOptions,
  );
}
