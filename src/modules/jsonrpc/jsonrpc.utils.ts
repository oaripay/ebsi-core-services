import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  UnsignedTransaction,
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSignedTransactionDto,
  ArgsInsertAdministrator,
  ArgsUpdateAdministrator,
  ArgsInsertIssuer,
  ArgsUpdateIssuer,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
} from "./dto";
import { prefixWith0x } from "../../shared/utils";

type JsonRpcDtos =
  | RequestInsertIssuerDto
  | RequestUpdateIssuerDto
  | RequestInsertAdministratorDto
  | RequestUpdateAdministratorDto
  | RequestInsertPolicyDto
  | RequestUpdatePolicyDto
  | RequestSignedTransactionDto
  | ArgsInsertIssuer
  | ArgsUpdateIssuer
  | ArgsInsertAdministrator
  | ArgsUpdateAdministrator
  | ArgsInsertPolicy
  | ArgsUpdatePolicy;

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
  const dataClass = new ClassTransformer().plainToClass<
    JsonRpcDtos,
    JsonRpcDtos
  >(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};

export const checkHash = (buffer: Buffer, hash: string): void => {
  const expectedHash = ethers.utils.sha256(buffer);
  if (prefixWith0x(hash) !== expectedHash)
    throw new Error(
      `Invalid issuer.attribute.hash. Received: ${prefixWith0x(
        hash
      )}. Expected: ${expectedHash}`
    );
};
