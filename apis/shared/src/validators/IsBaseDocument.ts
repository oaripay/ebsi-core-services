import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";

export const IS_BASE_DOCUMENT = "isBaseDocument";

export function isBaseDocument(value: unknown): boolean {
  try {
    if (typeof value !== "string") return false;
    const baseDocument = JSON.parse(value) as Record<string, unknown>;
    const context = baseDocument["@context"];
    if (!context) return false;
    if (
      (typeof context !== "string" ||
        context !== "https://www.w3.org/ns/did/v1") &&
      (!Array.isArray(context) ||
        context.length === 0 ||
        context[0] !== "https://www.w3.org/ns/did/v1")
    )
      return false;
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

    if (restrictedKeys.some((r) => keys.includes(r))) return false;
    return true;
  } catch (error) {
    return false;
  }
}

export function IsBaseDocument(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_BASE_DOCUMENT,
      validator: {
        validate: (value) => isBaseDocument(value),
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
