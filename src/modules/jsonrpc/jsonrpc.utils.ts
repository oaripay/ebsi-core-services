import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import {
  RequestDeleteAppAdministratorDto,
  RequestInsertAppDto,
  RequestInsertAppAdministratorDto,
  RequestInsertAppInfoDto,
  RequestInsertAdministratorDto,
  RequestSignedTransactionDto,
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
import { prefixWith0x } from "../../shared/utils";

type JsonRpcDtos =
  | RequestDeleteAppAdministratorDto
  | RequestInsertAppDto
  | RequestInsertAppAdministratorDto
  | RequestInsertAppInfoDto
  | RequestInsertAdministratorDto
  | RequestSignedTransactionDto
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
  const dataClass = new ClassTransformer().plainToClass(classType, data);
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

// Convert string permissions (e.g. "crud") into integer (e.g. 15)
export const computePermissions = (permissions: string): number => {
  const operations: { [x: string]: number } = {
    c: 8,
    r: 4,
    u: 2,
    d: 1,
  };

  return Object.keys(operations)
    .map((op) => (permissions.indexOf(op) >= 0 ? operations[op] : 0))
    .reduce((acc, val) => acc + val, 0);
};
