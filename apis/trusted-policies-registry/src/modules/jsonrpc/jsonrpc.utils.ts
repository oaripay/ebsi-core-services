import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  ArgsInsertPolicy,
  RequestInsertPolicyDto,
  ArgsUpdatePolicy,
  RequestUpdatePolicyDto,
  ArgsAddPolicyConditions,
  RequestAddPolicyConditionsDto,
  ArgsDeletePolicyCondition,
  RequestDeletePolicyConditionDto,
  ArgsActivatePolicy,
  RequestActivatePolicyDto,
  ArgsDeactivatePolicy,
  RequestDeactivatePolicyDto,
  ArgsInsertUserAttributes,
  RequestInsertUserAttributesDto,
  ArgsUpdateUserAttribute,
  RequestUpdateUserAttributeDto,
  ArgsDeleteUserAttribute,
  RequestDeleteUserAttributeDto,
} from "./dto/index.js";

export function formatEthersUnsignedTransaction(
  unsignedTransaction: UnsignedTransaction,
) {
  return {
    to: unsignedTransaction.to,
    data: unsignedTransaction.data,
    value: unsignedTransaction.value,
    nonce: Number(unsignedTransaction.nonce),
    chainId: Number(unsignedTransaction.chainId),
    gasLimit: unsignedTransaction.gasLimit,
    gasPrice: unsignedTransaction.gasPrice,
  } satisfies ethers.UnsignedTransaction;
}

export function formatEthersSignature(r: string, s: string, v: string) {
  return {
    r,
    s,
    v: Number(v),
  } satisfies Partial<ethers.Signature>;
}

type JsonRpcDtos =
  | RequestSendSignedTransactionDto
  | ArgsInsertPolicy
  | RequestInsertPolicyDto
  | ArgsUpdatePolicy
  | RequestUpdatePolicyDto
  | ArgsAddPolicyConditions
  | RequestAddPolicyConditionsDto
  | ArgsDeletePolicyCondition
  | RequestDeletePolicyConditionDto
  | ArgsActivatePolicy
  | RequestActivatePolicyDto
  | ArgsDeactivatePolicy
  | RequestDeactivatePolicyDto
  | ArgsInsertUserAttributes
  | RequestInsertUserAttributesDto
  | ArgsUpdateUserAttribute
  | RequestUpdateUserAttributeDto
  | ArgsDeleteUserAttribute
  | RequestDeleteUserAttributeDto;

const flattenValidationErrors = (
  errors: ClassValidator.ValidationError[],
  path: string[] = [],
): string => {
  return errors
    .map((validationError) => {
      const currentPath = [...path, validationError.property];

      if (
        validationError.children &&
        Array.isArray(validationError.children) &&
        validationError.children.length > 0
      ) {
        return flattenValidationErrors(validationError.children, currentPath);
      }

      const { constraints } = validationError;

      if (!constraints) {
        return "";
      }

      // Extract each error
      return Object.keys(constraints).map((constraint) => {
        return `- Invalid ${currentPath.join(".")} provided: ${
          constraints[constraint]
        }`;
      });
    })
    .join("\n");
};

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos,
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToInstance<
    JsonRpcDtos,
    JsonRpcDtos
  >(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(flattenValidationErrors(errors));
  }
};
