import { errors as EthersErrorCodes, Transaction } from "ethers";

export interface EthersError extends Error {
  address?: string;
  args?: unknown[];
  cancelled?: boolean;
  // Properties from code logic
  code: EthersErrorCodes;
  errorArgs?: unknown[];
  errorSignature?: string;
  hash?: string;
  method?: string;
  reason: string;
  receipt?: unknown;

  replacement?: unknown;
  /**
   * Properties documented
   * @see https://github.com/ethers-io/ethers.js/blob/master/packages/logger/src.ts/index.ts#L113-L148
   */
  transaction?: Transaction;
  // Properties from actual error returned
  transactionHash?: string;

  version?: string;
}

export function isEthersError(err: unknown): err is EthersError {
  if (err instanceof Error && "code" in err && "reason" in err) {
    return Object.values(EthersErrorCodes).includes((err as EthersError).code);
  }
  return false;
}

export default isEthersError;
