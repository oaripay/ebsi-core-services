import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "./policies.constants.js";

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
