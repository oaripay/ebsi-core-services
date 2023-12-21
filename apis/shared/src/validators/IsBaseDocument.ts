import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import type { ValidationResult } from "./types.js";

export const IS_BASE_DOCUMENT = "isBaseDocument";

export function isBaseDocument(value: unknown): ValidationResult {
  if (typeof value !== "string" || value === "") {
    return {
      success: false,
      error: "baseDocument must be a stringified JSON document",
    };
  }

  let baseDocument: Record<string, unknown>;

  try {
    baseDocument = JSON.parse(value) as Record<string, unknown>;
  } catch (error) {
    return {
      success: false,
      error: "baseDocument must be a stringified JSON document",
    };
  }

  const context = baseDocument["@context"];

  if (!context) {
    return {
      success: false,
      error: "'@context' attribute is missing",
    };
  }

  if (
    (typeof context !== "string" ||
      context !== "https://www.w3.org/ns/did/v1") &&
    (!Array.isArray(context) ||
      context.length === 0 ||
      context[0] !== "https://www.w3.org/ns/did/v1")
  ) {
    return {
      success: false,
      error:
        "'@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
    };
  }

  const keys = Object.keys(baseDocument);

  const restrictedKeys = [
    "id",
    "controller",
    "verificationMethod",
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ];

  const includedRestrictedKeys = restrictedKeys.filter((key) =>
    keys.includes(key),
  );

  if (includedRestrictedKeys.length > 0) {
    return {
      success: false,
      error: `attribute${
        includedRestrictedKeys.length > 1 ? "s" : ""
      } '${includedRestrictedKeys.join("', '")}' ${
        includedRestrictedKeys.length > 1 ? "are" : "is"
      } not allowed`,
    };
  }

  return { success: true };
}

export function IsBaseDocument(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_BASE_DOCUMENT,
      validator: {
        validate: (val) => isBaseDocument(val).success,
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
