import type { ClassConstructor } from "class-transformer";

import { ClassTransformer } from "class-transformer";
import * as ClassValidator from "class-validator";
import { ethers } from "ethers";

import {
  ArgsAddIssuerProxy,
  ArgsInsertIssuer,
  ArgsSetAttributeData,
  ArgsSetAttributeMetadata,
  ArgsUpdateIssuer,
  ArgsUpdateIssuerProxy,
  RequestAddIssuerProxyDto,
  RequestInsertIssuerDto,
  RequestSendSignedTransactionDto,
  RequestSetAttributeDataDto,
  RequestSetAttributeMetadataDto,
  RequestUpdateIssuerDto,
  RequestUpdateIssuerProxyDto,
  UnsignedTransaction,
} from "./dto/index.ts";

type JsonRpcDtos =
  | ArgsAddIssuerProxy
  | ArgsInsertIssuer
  | ArgsSetAttributeData
  | ArgsSetAttributeMetadata
  | ArgsUpdateIssuer
  | ArgsUpdateIssuerProxy
  | RequestAddIssuerProxyDto
  | RequestInsertIssuerDto
  | RequestSendSignedTransactionDto
  | RequestSetAttributeDataDto
  | RequestSetAttributeMetadataDto
  | RequestUpdateIssuerDto
  | RequestUpdateIssuerProxyDto;

export function formatEthersSignature(r: string, s: string, v: string) {
  return {
    r,
    s,
    v: Number(v) as 27 | 28,
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
    // Legacy transaction type
    // We have to explicitly set it to 0 because ethers.js v6 incorrectly infers it as 1 otherwise
    // Potential fix: https://github.com/ethers-io/ethers.js/pull/4859
    type: 0,
    value: unsignedTransaction.value,
  } satisfies ethers.TransactionLike;
}

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
