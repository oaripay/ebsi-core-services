import { describe } from "@jest/globals";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
} from "../../policies/policies.interface";
import { validatePolicyCondition } from "./IsPolicyConditions";

describe.each([
  {
    name: "condition-string",
    attributeName: "any",
    value: "0x0000",
    attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
    typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
  },
  {
    name: "condition-bytes",
    attributeName: "any",
    value: "0x0000",
    attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
    typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES"),
  },
  {
    name: "condition-boolean",
    attributeName: "any",
    value: `0x${"00".repeat(32)}`,
    attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
    typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
  },
  {
    name: "condition-address",
    attributeName: "any",
    value: "0x00000000219ab540356cbb839cbe05303d7705fa",
    attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
    typeOfValue: ATTRIBUTE_TYPES.indexOf("ADDRESS"),
  },
  {
    name: "condition-uint256",
    attributeName: "any",
    value: `0x${(42).toString(16)}`,
    attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
    typeOfValue: ATTRIBUTE_TYPES.indexOf("UINT256"),
  },
])("validatePolicyCondition", (policyCondition) => {
  it("should work", () => {
    expect(() => validatePolicyCondition(policyCondition)).not.toThrow();
  });
});

describe.each([
  {
    policyCondition: "bad policy",
    error: "policy condition must be an object",
  },
  {
    policyCondition: {
      name: 40,
      attributeName: "any",
      value: "0x0000",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    error: "name must be a string",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: 40,
      value: "0x0000",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    error: "attributeName must be a string",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: "0x0000",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: "bad type",
    },
    error:
      "typeOfValue must be 0 (UINT256), 1 (BYTES), 2 (ADDRESS), 3 (BYTES32), 4 (STRING), or 5 (BOOLEAN)",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: "0x0000",
      attributeOperation: "bad attribute",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    error: "attributeOperation must be 0 (AND)",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: 40,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    error: "value must be a string",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: "0x1",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    error: "value must have an even size",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: `0x${"FF".repeat(33)}`,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("UINT256"),
    },
    error: "value is not a valid UINT256",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: `0x${"FF".repeat(33)}`,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES32"),
    },
    error: "value is not a valid BYTES32",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: `0xTT`,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES"),
    },
    error: "value is not a valid BYTES",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: `0x${"FF".repeat(12)}`,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("ADDRESS"),
    },
    error: "value is not a valid ADDRESS",
  },
  {
    policyCondition: {
      name: "condition-string",
      attributeName: "any",
      value: "0x00",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    error: "value is not a valid BOOLEAN",
  },
])(
  "validatePolicyCondition",
  (test: { policyCondition: unknown; error: string }) => {
    it("should throw error", () => {
      expect(() => validatePolicyCondition(test.policyCondition)).toThrow(
        test.error
      );
    });
  }
);
