import * as ClassValidator from "class-validator";
import { ClassTransformer } from "class-transformer";
import { ClassType } from "class-transformer/ClassTransformer";
import { ethers } from "ethers";
import UnsignedTransaction from "./dto/signedTransaction/unsigned-transaction.dto";
import { prefixWith0x } from "../../shared/utils";

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
  classType: ClassType<unknown>,
  data: unknown
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToClass(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};

export const checkHash = (buffer: Buffer, hash: string): void => {
  const expectedHash = ethers.utils.keccak256(buffer);
  if (prefixWith0x(hash) !== expectedHash)
    throw new Error(
      `Invalid issuer.attribute.hash. Received: ${prefixWith0x(
        hash
      )}. Expected: ${expectedHash}`
    );
};
