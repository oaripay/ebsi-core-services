import { ClassConstructor, ClassTransformer } from "class-transformer";
import * as ClassValidator from "class-validator";
import { ethers } from "ethers";

import {
  ArgsAddController,
  ArgsAddVerificationMethod,
  ArgsAddVerificationRelationship,
  ArgsExpireVerificationMethod,
  ArgsInsertDidDocument,
  ArgsRevokeController,
  ArgsRevokeVerificationMethod,
  ArgsRollVerificationMethod,
  ArgsUpdateBaseDocument,
  RequestAddControllerDto,
  RequestAddVerificationMethodDto,
  RequestAddVerificationRelationshipDto,
  RequestExpireVerificationMethodDto,
  RequestInsertDidDocumentDto,
  RequestRevokeControllerDto,
  RequestRevokeVerificationMethodDto,
  RequestRollVerificationMethodDto,
  RequestSendSignedTransactionDto,
  RequestUpdateBaseDocumentDto,
  UnsignedTransaction,
} from "./dto/index.js";

type JsonRpcDtos =
  | ArgsAddController
  | ArgsAddVerificationMethod
  | ArgsAddVerificationRelationship
  | ArgsExpireVerificationMethod
  | ArgsInsertDidDocument
  | ArgsRevokeController
  | ArgsRevokeVerificationMethod
  | ArgsRollVerificationMethod
  | ArgsUpdateBaseDocument
  | RequestAddControllerDto
  | RequestAddVerificationMethodDto
  | RequestAddVerificationRelationshipDto
  | RequestExpireVerificationMethodDto
  | RequestInsertDidDocumentDto
  | RequestRevokeControllerDto
  | RequestRevokeVerificationMethodDto
  | RequestRollVerificationMethodDto
  | RequestSendSignedTransactionDto
  | RequestUpdateBaseDocumentDto;

export function formatEthersSignature(r: string, s: string, v: string) {
  return {
    r,
    s,
    v: Number(v),
  } satisfies Partial<ethers.Signature>;
}

export function formatEthersUnsignedTransaction(
  unsignedTransaction: UnsignedTransaction,
) {
  return {
    chainId: Number(unsignedTransaction.chainId),
    data: unsignedTransaction.data,
    gasLimit: unsignedTransaction.gasLimit,
    gasPrice: unsignedTransaction.gasPrice,
    nonce: Number(unsignedTransaction.nonce),
    to: unsignedTransaction.to,
    value: unsignedTransaction.value,
  } satisfies ethers.UnsignedTransaction;
}

const getErrorMessages = (
  errors: ClassValidator.ValidationError[],
): string[] => {
  return errors.flatMap((err) => {
    const errorMessages: string[] = [];
    if (err.constraints) {
      errorMessages.push(...Object.values(err.constraints));
    }

    if (err.children) {
      errorMessages.push(...getErrorMessages(err.children));
    }

    return errorMessages;
  });
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
    const errorMessages = getErrorMessages(errors);

    if (errorMessages.length === 1) {
      throw new Error(`Validation error: ${errorMessages[0]}`);
    }

    throw new Error(
      `Validation errors:${errorMessages.map((err) => `\n- ${err}`).join(",")}`,
    );
  }
};
