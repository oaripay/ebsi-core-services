import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  RequestSignedTransactionDto,
  UnsignedTransaction,
  ArgsInsertAdministrator,
  RequestInsertAdministratorDto,
  ArgsUpdateAdministrator,
  RequestUpdateAdministratorDto,
  ArgsInsertHashAlgorithm,
  RequestInsertHashAlgorithmDto,
  ArgsUpdateHashAlgorithm,
  RequestUpdateHashAlgorithmDto,
  ArgsInsertPolicy,
  RequestInsertPolicyDto,
  ArgsUpdatePolicy,
  RequestUpdatePolicyDto,
  ArgsInsertDidController,
  RequestInsertDidControllerDto,
  ArgsInsertDidDocument,
  RequestInsertDidDocumentDto,
  ArgsUpdateDidDocument,
  RequestUpdateDidDocumentDto,
  ArgsUpdateDidController,
  RequestUpdateDidControllerDto,
  ArgsRevokeDidController,
  RequestRevokeDidControllerDto,
  ArgsInsertDidMethod,
  RequestInsertDidMethodDto,
  ArgsUpdateDidMethod,
  RequestUpdateDidMethodDto,
  ArgsAppendDidDocumentVersionHash,
  RequestAppendDidDocumentVersionHashDto,
  ArgsDetachDidDocumentVersionHash,
  RequestDetachDidDocumentVersionHashDto,
  ArgsAppendDidDocumentVersionMetadata,
  RequestAppendDidDocumentVersionMetadataDto,
  ArgsDetachDidDocumentVersionMetadata,
  RequestDetachDidDocumentVersionMetadataDto,
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
  };
}

type JsonRpcDtos =
  | RequestSignedTransactionDto
  | ArgsInsertAdministrator
  | RequestInsertAdministratorDto
  | ArgsUpdateAdministrator
  | RequestUpdateAdministratorDto
  | ArgsInsertHashAlgorithm
  | RequestInsertHashAlgorithmDto
  | ArgsUpdateHashAlgorithm
  | RequestUpdateHashAlgorithmDto
  | RequestUpdateHashAlgorithmDto
  | ArgsInsertPolicy
  | RequestInsertPolicyDto
  | ArgsUpdatePolicy
  | RequestUpdatePolicyDto
  | ArgsInsertDidController
  | RequestInsertDidControllerDto
  | ArgsInsertDidDocument
  | RequestInsertDidDocumentDto
  | ArgsUpdateDidDocument
  | RequestUpdateDidDocumentDto
  | ArgsUpdateDidController
  | RequestUpdateDidControllerDto
  | ArgsRevokeDidController
  | RequestRevokeDidControllerDto
  | ArgsInsertDidMethod
  | RequestInsertDidMethodDto
  | ArgsUpdateDidMethod
  | RequestUpdateDidMethodDto
  | ArgsAppendDidDocumentVersionHash
  | RequestAppendDidDocumentVersionHashDto
  | ArgsDetachDidDocumentVersionHash
  | RequestDetachDidDocumentVersionHashDto
  | ArgsAppendDidDocumentVersionMetadata
  | RequestAppendDidDocumentVersionMetadataDto
  | ArgsDetachDidDocumentVersionMetadata
  | RequestDetachDidDocumentVersionMetadataDto;

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToClass<
    JsonRpcDtos,
    JsonRpcDtos
  >(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};
