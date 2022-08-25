import BigNumber from "bn.js";

export enum OperationType {
  AND,
}

export enum Operation {
  EQUAL,
}

export enum TypeOfValue {
  TYPE_UINT256,
  TYPE_BYTES,
  TYPE_ADDRESS,
  TYPE_BYTES32,
  TYPE_STRING,
  TYPE_BOOLEAN,
}

export enum AssertType {
  DID,
}

export type PolicyCondition = {
  name: string;
  attributeName: string;
  typeOfValue: number;
  value: string;
  attributeOperation: number;
  status: number;
};

export type InsertNewPolicyValueType = {
  id?: number;
  opType: number;
  policyName: string;
  description: string;
  policyConditions?: PolicyCondition[];
};

export type PolicyTableItem = {
  id: number;
  description?: string;
  policyName?: string;
  opType?: string;
  policyConditions?: PolicyCondition[];
};

export type PaginatedResponseType = {
  total: BigNumber;
  howMany: BigNumber;
};

export type PaginatedResponseTypeBn = PaginatedResponseType & {
  items: BigNumber[];
};

export type PaginatedResponseTypeString = PaginatedResponseType & {
  items: string[];
};

export type AttributeType = {
  attribute: string;
  value: string;
};

export type InsertUserAttrValueType = {
  address: string;
  attributesWithValues: AttributeType[];
};

export type UserTableRow = {
  id: number;
  address: string;
};

export type UserAttributeRow = {
  id: number;
  name: string;
};

export type EditFormValueType = {
  address: string;
  attribute: string;
  value: string;
};
