import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  ArgsInsertHashAlgorithm,
  ArgsUpdateHashAlgorithm,
  ArgsTimestampHashes,
  ArgsTimestampRecordHashes,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestTimestampHashesDto,
  RequestTimestampRecordHashesDto,
  RequestTimestampRecordVersionHashesDto,
  RequestAppendRecordVersionHashesDto,
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  RequestDetachRecordVersionHashDto,
  ArgsDetachRecordVersionHash,
  ArgsInsertRecordOwner,
  RequestInsertRecordOwnerDto,
  ArgsRevokeRecordOwner,
  RequestRevokeRecordOwnerDto,
  ArgsInsertRecordVersionInfo,
  RequestInsertRecordVersionInfoDto,
  RequestTimestampVersionHashesDto,
  ArgsTimestampVersionHashes,
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
  | RequestInsertHashAlgorithmDto
  | RequestUpdateHashAlgorithmDto
  | RequestTimestampHashesDto
  | RequestTimestampRecordHashesDto
  | RequestTimestampRecordVersionHashesDto
  | RequestTimestampVersionHashesDto
  | RequestAppendRecordVersionHashesDto
  | RequestDetachRecordVersionHashDto
  | RequestInsertRecordOwnerDto
  | RequestRevokeRecordOwnerDto
  | RequestInsertRecordVersionInfoDto
  | ArgsInsertHashAlgorithm
  | ArgsUpdateHashAlgorithm
  | ArgsTimestampHashes
  | ArgsDetachRecordVersionHash
  | ArgsInsertRecordOwner
  | ArgsRevokeRecordOwner
  | ArgsTimestampRecordHashes
  | ArgsInsertRecordVersionInfo
  | ArgsTimestampVersionHashes;

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
    throw new Error(errors.toString());
  }
};
