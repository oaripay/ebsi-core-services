import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  UnsignedTransaction,
  RequestSetAttributeMetadataDto,
  RequestSetAttributeDataDto,
  RequestSendSignedTransactionDto,
  ArgsSetAttributeMetadata,
  ArgsSetAttributeData,
  RequestAddIssuerProxyDto,
  RequestUpdateIssuerProxyDto,
  ArgsAddIssuerProxy,
  ArgsUpdateIssuerProxy,
} from "./dto/index.js";

type JsonRpcDtos =
  | RequestSetAttributeMetadataDto
  | RequestSetAttributeDataDto
  | RequestAddIssuerProxyDto
  | RequestUpdateIssuerProxyDto
  | RequestSendSignedTransactionDto
  | ArgsSetAttributeMetadata
  | ArgsSetAttributeData
  | ArgsAddIssuerProxy
  | ArgsUpdateIssuerProxy;

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
  const dataClass = new ClassTransformer().plainToInstance<
    JsonRpcDtos,
    JsonRpcDtos
  >(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};
