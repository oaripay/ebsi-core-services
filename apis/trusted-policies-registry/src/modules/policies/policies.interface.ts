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
  name: string;
  attributeName: string;
  typeOfValue: typeof ATTRIBUTE_TYPES[number];
  value: string | boolean;
  attributeOperation: typeof ATTRIBUTE_OPERATIONS[number];
}

export interface PolicyResponseObject {
  policyId: string;
  description: string;
  policyName: string;
  operationType: typeof OPERATION_TYPES[number];
  status: boolean;
  policyConditions: PolicyConditionStructOutput[];
}

export interface PolicyLink {
  policyName: string;
  href: string;
}
