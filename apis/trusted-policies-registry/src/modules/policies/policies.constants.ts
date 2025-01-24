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
