// Mappings number -> string
// (see contracts/trusted-policies-registry/PolicyStorage.sol)
export const ATTRIBUTE_OPERATIONS = [
  "EQUAL",
  // To be implemented: GREATER_THAN, SMALLER_THAN
] as const;

export const ATTRIBUTE_TYPES = [
  "UINT256",
  "BYTES",
  "ADDRESS",
  "BYTES32",
  "STRING",
  "BOOLEAN",
] as const;

export const OPERATION_TYPES = [
  "AND",
  "OR",
  // To be implemented: XOR, NOR
] as const;

export interface PolicyConditionStructOutput {
  attributeName: string;
  attributeOperation: (typeof ATTRIBUTE_OPERATIONS)[number];
  name: string;
  typeOfValue: (typeof ATTRIBUTE_TYPES)[number];
  value: boolean | string;
}

export interface PolicyLink {
  href: string;
  policyName: string;
}

export interface PolicyResponseObject {
  description: string;
  operationType: (typeof OPERATION_TYPES)[number];
  policyConditions: PolicyConditionStructOutput[];
  policyId: string;
  policyName: string;
  status: boolean;
}
