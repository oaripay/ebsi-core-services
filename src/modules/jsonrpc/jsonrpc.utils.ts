import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  RequestDeleteAppAdministratorDto,
  RequestInsertAppDto,
  RequestInsertAppAdministratorDto,
  RequestInsertAppInfoDto,
  RequestInsertAdministratorDto,
  RequestSendSignedTransactionDto,
  RequestUpdateAdministratorDto,
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
  ArgsInsertAdministrator,
  ArgsUpdateAdministrator,
  ArgsUpdateApp,
  ArgsInsertRevocation,
  ArgsInsertAppPublicKey,
  ArgsUpdateAppPublicKey,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  ArgsInsertAuthorization,
  ArgsUpdateAuthorization,
} from "./dto";

type JsonRpcDtos =
  | RequestDeleteAppAdministratorDto
  | RequestInsertAppDto
  | RequestInsertAppAdministratorDto
  | RequestInsertAppInfoDto
  | RequestInsertAdministratorDto
  | RequestSendSignedTransactionDto
  | RequestUpdateAdministratorDto
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
  | ArgsInsertAdministrator
  | ArgsUpdateAdministrator
  | ArgsUpdateApp
  | ArgsInsertRevocation
  | ArgsInsertAppPublicKey
  | ArgsUpdateAppPublicKey
  | ArgsInsertPolicy
  | ArgsUpdatePolicy
  | ArgsInsertAuthorization
  | ArgsUpdateAuthorization;

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

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToInstance(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};
