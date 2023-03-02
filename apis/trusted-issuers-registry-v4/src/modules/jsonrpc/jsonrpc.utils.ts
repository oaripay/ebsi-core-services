import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  UnsignedTransaction,
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSetAttributeMetadataDto,
  RequestSetAttributeDataDto,
  RequestSendSignedTransactionDto,
  ArgsInsertIssuer,
  ArgsUpdateIssuer,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  ArgsSetAttributeMetadata,
  ArgsSetAttributeData,
  RequestAddIssuerProxyDto,
  RequestUpdateIssuerProxyDto,
  ArgsAddIssuerProxy,
  ArgsUpdateIssuerProxy,
} from "./dto";

type JsonRpcDtos =
  | RequestInsertIssuerDto
  | RequestUpdateIssuerDto
  | RequestSetAttributeMetadataDto
  | RequestSetAttributeDataDto
  | RequestAddIssuerProxyDto
  | RequestUpdateIssuerProxyDto
  | RequestInsertPolicyDto
  | RequestUpdatePolicyDto
  | RequestSendSignedTransactionDto
  | ArgsInsertIssuer
  | ArgsUpdateIssuer
  | ArgsSetAttributeMetadata
  | ArgsSetAttributeData
  | ArgsInsertPolicy
  | ArgsUpdatePolicy
  | ArgsAddIssuerProxy
  | ArgsUpdateIssuerProxy;

export function formatEthersUnsignedTransaction(
  unsignedTransaction: UnsignedTransaction
): ethers.UnsignedTransaction & ethers.providers.TransactionRequest {
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
    throw new Error(errors.toString());
  }
};
