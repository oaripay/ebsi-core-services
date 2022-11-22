import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  ArgsInsertDidDocument,
  RequestInsertDidDocumentDto,
  ArgsUpdateBaseDocument,
  RequestUpdateBaseDocumentDto,
  ArgsAddController,
  RequestAddControllerDto,
  ArgsRevokeController,
  RequestRevokeControllerDto,
  ArgsAddVerificationMethod,
  RequestAddVerificationMethodDto,
  ArgsAddVerificationRelationship,
  RequestAddVerificationRelationshipDto,
  ArgsRevokeVerificationMethod,
  RequestRevokeVerificationMethodDto,
  ArgsExpireVerificationMethod,
  RequestExpireVerificationMethodDto,
  ArgsRollVerificationMethod,
  RequestRollVerificationMethodDto,
} from "./dto";

export function formatEthersUnsignedTransaction(
  unsignedTransaction: UnsignedTransaction
): ethers.UnsignedTransaction {
  return {
    to: unsignedTransaction.to,
    data: unsignedTransaction.data,
    value: unsignedTransaction.value,
    nonce: Number(unsignedTransaction.nonce),
    chainId: Number(unsignedTransaction.chainId),
    gasLimit: unsignedTransaction.gasLimit,
    gasPrice: unsignedTransaction.gasPrice,
  };
}

export function formatEthersSignature(
  r: string,
  s: string,
  v: string
): ethers.Signature {
  return {
    r,
    s,
    v: Number(v),
    recoveryParam: null,
    _vs: null,
  } as ethers.Signature;
}

type JsonRpcDtos =
  | RequestSendSignedTransactionDto
  | ArgsInsertDidDocument
  | RequestInsertDidDocumentDto
  | ArgsUpdateBaseDocument
  | RequestUpdateBaseDocumentDto
  | ArgsAddController
  | RequestAddControllerDto
  | ArgsRevokeController
  | RequestRevokeControllerDto
  | ArgsAddVerificationMethod
  | RequestAddVerificationMethodDto
  | ArgsAddVerificationRelationship
  | RequestAddVerificationRelationshipDto
  | ArgsRevokeVerificationMethod
  | RequestRevokeVerificationMethodDto
  | ArgsExpireVerificationMethod
  | RequestExpireVerificationMethodDto
  | ArgsRollVerificationMethod
  | RequestRollVerificationMethodDto;

const getErrorMessages = (
  errors: ClassValidator.ValidationError[]
): string[] => {
  return errors
    .map((err) => {
      const errorMessages: string[] = [];
      if (err.constraints) {
        errorMessages.push(...Object.values(err.constraints));
      }

      if (err.children) {
        errorMessages.push(...getErrorMessages(err.children));
      }

      return errorMessages;
    })
    .flat();
};

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos
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
      `Validation errors:${errorMessages.map((err) => `\n- ${err}`).join()}`
    );
  }
};
