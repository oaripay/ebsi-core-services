import { buildMessage, registerDecorator } from "class-validator";

// Commented methods are private
// Methods that are not listed here are not available through Ledger API
export const PUBLIC_BESU_METHODS = [
  "net_version",
  "eth_chainId",
  "eth_blockNumber",
  "eth_getTransactionCount",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getUncleByBlockHashAndIndex",
  "eth_getUncleByBlockNumberAndIndex",
  "eth_getUncleCountByBlockHash",
  "eth_getUncleCountByBlockNumber",
  "eth_getCode",
  // "eth_sendRawTransaction",
  "eth_call",
  // "eth_estimateGas",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionReceipt",
  "eth_getLogs",
] as const;

export function IsValidMethod() {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: "isValidMethod",
      propertyName,
      target: object.constructor,
      validator: {
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid method`,
        ),
        validate(value: unknown) {
          return (
            typeof value === "string" && PUBLIC_BESU_METHODS.includes(value)
          );
        },
      },
    });
  };
}

export default { IsValidMethod };
