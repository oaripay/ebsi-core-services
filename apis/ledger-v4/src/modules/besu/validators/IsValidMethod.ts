import { registerDecorator, buildMessage } from "class-validator";

// Allowed methods are defined in the specs
// https://ec.europa.eu/digital-building-blocks/wikis/display/BLOCKCHAININT/Ledger+API
const allowedMethods = [
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
  "eth_sendRawTransaction",
  "eth_call",
  "eth_estimateGas",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionReceipt",
  "eth_getLogs",
];

export function IsValidMethod() {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: "isValidMethod",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && allowedMethods.includes(value);
        },
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid method`,
        ),
      },
    });
  };
}

export default { IsValidMethod };
