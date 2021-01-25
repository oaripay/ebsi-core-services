import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import UnsignedTransaction from "./dto/signedTransaction/unsigned-transaction.dto";
import { prefixWith0x } from "../../shared/utils";
import RequestInsertIssuerDto from "./dto/insertIssuer/request-insert-issuer.dto";
import RequestUpdateIssuerDto from "./dto/updateIssuer/request-update-issuer.dto";
import RequestInsertAdministratorDto from "./dto/insertAdministrator/request-insert-administrator.dto";
import RequestUpdateAdministratorDto from "./dto/updateAdministrator/request-update-administrator.dto";
import RequestInsertPolicyDto from "./dto/insertPolicy/request-insert-policy.dto";
import RequestSignedTransactionDto from "./dto/signedTransaction/request-signed-transaction.dto";
import ArgsInsertIssuer from "./dto/signedTransaction/args-insert-issuer.dto";
import ArgsUpdateIssuer from "./dto/signedTransaction/args-update-issuer.dto";
import ArgsInsertAdministrator from "./dto/signedTransaction/args-insert-administrator.dto";
import ArgsUpdateAdministrator from "./dto/signedTransaction/args-update-administrator.dto";
import ArgsInsertPolicy from "./dto/signedTransaction/args-insert-policy.dto";
import ArgsUpdatePolicy from "./dto/signedTransaction/args-update-policy.dto";

type JsonRpcDtos =
  | RequestInsertIssuerDto
  | RequestUpdateIssuerDto
  | RequestInsertAdministratorDto
  | RequestUpdateAdministratorDto
  | RequestInsertPolicyDto
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
