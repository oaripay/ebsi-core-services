import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";
import { ATTRIBUTE_TYPES } from "../../policies/policies.interface.js";

export const IS_POLICY_CONDITIONS = "isPolicyConditions";

export function validatePolicyCondition(val: unknown): void {
  if (typeof val !== "object")
    throw new Error("policy condition must be an object");

  const { name, attributeName, typeOfValue, value, attributeOperation } =
    val as {
      name: string;
      attributeName: string;
      typeOfValue: number;
      value: string;
      attributeOperation: number;
    };

  if (typeof name !== "string") throw new Error("name must be a string");
  if (typeof attributeName !== "string")
    throw new Error("attributeName must be a string");
  if (typeof typeOfValue !== "number" || typeOfValue < 0 || typeOfValue > 5)
    throw new Error(
      "typeOfValue must be 0 (UINT256), 1 (BYTES), 2 (ADDRESS), 3 (BYTES32), 4 (STRING), or 5 (BOOLEAN)",
    );
  if (attributeOperation !== 0)
    throw new Error("attributeOperation must be 0 (AND)");
  if (typeof value !== "string") throw new Error("value must be a string");
  if (value.length % 2 !== 0) throw new Error("value must have an even size");

  const type = ATTRIBUTE_TYPES[typeOfValue];
  switch (type) {
    case "UINT256": {
      if (!/^0x[0-9a-fA-F]+$/.test(value) || value.length > 66)
        throw new Error(`value is not a valid ${type}`);
      break;
    }
    case "BYTES32": {
      if (!/^0x[0-9a-fA-F]{64}$/.test(value))
        throw new Error(`value is not a valid ${type}`);
      break;
    }
    case "STRING":
    case "BYTES": {
      if (!/^0x[0-9a-fA-F]+$/.test(value))
        throw new Error(`value is not a valid ${type}`);
      break;
    }
    case "ADDRESS": {
      if (!/^0x[0-9a-fA-F]{40}$/.test(value))
        throw new Error(`value is not a valid ${type}`);
      break;
    }
    case "BOOLEAN": {
      if (
        value !== `0x${"00".repeat(32)}` &&
        value !== `0x${"00".repeat(31)}01`
      )
        throw new Error(`value is not a valid ${type}`);
      break;
    }
    default: {
      break;
    }
  }
}

export function isPolicyConditions(val: unknown): boolean {
  try {
    validatePolicyCondition(val);
    return true;
  } catch (error) {
    return false;
  }
}

export function IsPolicyConditions(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_POLICY_CONDITIONS,
      validator: {
        validate: (value) => isPolicyConditions(value),
        defaultMessage: buildMessage((eachPrefix, args) => {
          if (!args) {
            return "Undefined args";
          }

          const errorMessages: string[] = [];
          if (!Array.isArray(args.value))
            return `${eachPrefix}$property must be an array`;
          (args.value as unknown[]).forEach((value, i) => {
            try {
              validatePolicyCondition(value);
            } catch (error) {
              errorMessages.push(`condition ${i}: ${(error as Error).message}`);
            }
          });
          return `${eachPrefix}$property. ${errorMessages.join(", ")}`;
        }, validationOptions),
      },
    },
    validationOptions,
  );
}
