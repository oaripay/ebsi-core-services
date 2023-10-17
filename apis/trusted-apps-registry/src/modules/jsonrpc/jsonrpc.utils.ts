import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  RequestDeleteAppAdministratorDto,
  RequestInsertAppDto,
  RequestInsertAppAdministratorDto,
  RequestInsertAppInfoDto,
  RequestSendSignedTransactionDto,
  RequestUpdateAppDto,
  RequestInsertRevocationDto,
  RequestInsertAppPublicKeyDto,
  RequestUpdateAppPublicKeyDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestInsertAuthorizationDto,
  RequestUpdateAuthorizationDto,
  UnsignedTransaction,
  ArgsDeleteAppAdministrator,
  ArgsInsertApp,
  ArgsInsertAppAdministrator,
  ArgsInsertAppInfo,
  ArgsUpdateApp,
  ArgsInsertRevocation,
  ArgsInsertAppPublicKey,
  ArgsUpdateAppPublicKey,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  ArgsInsertAuthorization,
  ArgsUpdateAuthorization,
} from "./dto/index.js";

type JsonRpcDtos =
  | RequestDeleteAppAdministratorDto
  | RequestInsertAppDto
  | RequestInsertAppAdministratorDto
  | RequestInsertAppInfoDto
  | RequestSendSignedTransactionDto
  | RequestUpdateAppDto
  | RequestInsertRevocationDto
  | RequestInsertAppPublicKeyDto
  | RequestUpdateAppPublicKeyDto
  | RequestInsertPolicyDto
  | RequestUpdatePolicyDto
  | RequestInsertAuthorizationDto
  | RequestUpdateAuthorizationDto
  | UnsignedTransaction
  | ArgsDeleteAppAdministrator
  | ArgsInsertApp
  | ArgsInsertAppAdministrator
  | ArgsInsertAppInfo
  | ArgsUpdateApp
  | ArgsInsertRevocation
  | ArgsInsertAppPublicKey
  | ArgsUpdateAppPublicKey
  | ArgsInsertPolicy
  | ArgsUpdatePolicy
  | ArgsInsertAuthorization
  | ArgsUpdateAuthorization;

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

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos,
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToInstance(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};
