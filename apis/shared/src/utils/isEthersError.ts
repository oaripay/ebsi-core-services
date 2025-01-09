import type { EthersError } from "ethers";

const errorsCodes = [
  // Generic Errors
  "UNKNOWN_ERROR",
  "NOT_IMPLEMENTED",
  "UNSUPPORTED_OPERATION",
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "TIMEOUT",
  "BAD_DATA",
  "CANCELLED",
  // Operational Errors
  "BUFFER_OVERRUN",
  "NUMERIC_FAULT",
  // Argument Errors
  "INVALID_ARGUMENT",
  "MISSING_ARGUMENT",
  "UNEXPECTED_ARGUMENT",
  "VALUE_MISMATCH",
  // Blockchain Errors
  "CALL_EXCEPTION",
  "INSUFFICIENT_FUNDS",
  "NONCE_EXPIRED",
  "REPLACEMENT_UNDERPRICED",
  "TRANSACTION_REPLACED",
  "UNCONFIGURED_NAME",
  "OFFCHAIN_FAULT",
  // User Interaction
  "ACTION_REJECTED",
];

export function isEthersError(err: unknown): err is EthersError {
  if (err instanceof Error && "code" in err && typeof err.code === "string") {
    return Object.values(errorsCodes).includes(err.code);
  }
  return false;
}

export default isEthersError;
