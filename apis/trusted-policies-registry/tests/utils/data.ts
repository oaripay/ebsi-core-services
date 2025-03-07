import crypto from "node:crypto";

import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "../../src/modules/policies/policies.constants.ts";

export function createPolicy(policyId: number, policyName: string) {
  const opType = OPERATION_TYPES.indexOf("AND");
  const policyConditions = [
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "vxc4gdbfgb",
      name: `condition-string-${crypto.randomBytes(16).toString("hex")}`,
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
      value: `0x${Buffer.from("vxc4gdbfgb", "utf8").toString("hex")}`,
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "0x61736461736464", // bytes representation of "asdasdd"
      name: `condition-bytes-${crypto.randomBytes(16).toString("hex")}`,
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES"),
      value: `0x${Buffer.from("asdasdd", "utf8").toString("hex")}`,
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: false,
      name: `condition-boolean-uint8array-${crypto
        .randomBytes(16)
        .toString("hex")}`,
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
      value: `0x${"00".repeat(32)}`,
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "0x00000000219ab540356cbb839cbe05303d7705fa",
      name: `condition-address-${crypto.randomBytes(16).toString("hex")}`,
      typeOfValue: ATTRIBUTE_TYPES.indexOf("ADDRESS"),
      value: "0x00000000219ab540356cbb839cbe05303d7705fa",
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "42", // as string, because UINT256 can be greater than JS' Number.MAX_SAFE_INTEGER
      name: `condition-uint256-${crypto.randomBytes(16).toString("hex")}`,
      typeOfValue: ATTRIBUTE_TYPES.indexOf("UINT256"),
      value: `0x${(42).toString(16)}`, // 42 in hex
    },
  ];
  const description = crypto.randomBytes(16).toString("hex");

  return {
    description,
    opType,
    policyConditions,
    policyId,
    policyName,
    status: true,
  };
}

export default createPolicy;
