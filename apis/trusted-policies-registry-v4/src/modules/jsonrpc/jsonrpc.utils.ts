import { ethers } from "ethers";

import { UnsignedTransaction } from "./validators/index.js";

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
    type: 0, // Legacy transaction type
    value: unsignedTransaction.value,
  } satisfies ethers.TransactionLike;
}
