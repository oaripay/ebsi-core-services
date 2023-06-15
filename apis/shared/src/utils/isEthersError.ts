import { errors as EthersErrorCodes, Transaction } from "ethers";

export interface EthersError extends Error {
  /**
   * Properties documented
   * @see https://github.com/ethers-io/ethers.js/blob/master/packages/logger/src.ts/index.ts#L113-L148
   */
  transaction?: Transaction;
  address?: string;
  args?: unknown[];
  method?: string;
  errorSignature?: string;
  errorArgs?: unknown[];
  cancelled?: boolean;
  hash?: string;
  replacement?: unknown;
  receipt?: unknown;

  // Properties from code logic
  code: EthersErrorCodes;
  reason: string;
  version?: string;

  // Properties from actual error returned
  transactionHash?: string;
}

export function isEthersError(err: unknown): err is EthersError {
  if (err instanceof Error && "code" in err && "reason" in err) {
    return Object.values(EthersErrorCodes).includes((err as EthersError).code);
  }
  return false;
}

export default isEthersError;
