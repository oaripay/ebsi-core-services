import crypto from "crypto";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "../../src/modules/policies/policies.interface";

export function createPolicy() {
  const opType = OPERATION_TYPES.indexOf("AND");
  const policyConditions = [
    {
      name: "condition-string",
      attributeName: "any",
      value: `0x${Buffer.from("vxc4gdbfgb", "utf-8").toString("hex")}`,
      expectedValue: "vxc4gdbfgb",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    {
      name: "condition-bytes",
      attributeName: "any",
      value: `0x${Buffer.from("asdasdd", "utf-8").toString("hex")}`,
      expectedValue: "0x61736461736464", // bytes representation of "asdasdd"
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES"),
    },
    {
      name: "condition-boolean-uint8array",
      attributeName: "any",
      value: "0x00",
      expectedValue: false,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    {
      name: "condition-address",
      attributeName: "any",
      value: "0x00000000219ab540356cbb839cbe05303d7705fa",
      expectedValue: "0x00000000219ab540356cbb839cbe05303d7705fa",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("ADDRESS"),
    },
    {
      name: "condition-uint256",
      attributeName: "any",
      value: `0x${(42).toString(16)}`, // 42 in hex
      expectedValue: "42", // as string, because UINT256 can be greater than JS' Number.MAX_SAFE_INTEGER
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("UINT256"),
    },
  ];
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const registry = `registry-test-${crypto.randomBytes(16).toString("hex")}`;

  return {
    opType,
    policyConditions,
    policyName,
    registry,
    status: true,
  };
}

export default createPolicy;
