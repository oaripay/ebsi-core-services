import { Transaction, TxOptions } from "@ethereumjs/tx";
import Common from "@ethereumjs/common";
import { BesuDto } from "./dto";

function isHexPrefixed(str: string): boolean {
  return str.slice(0, 2) === "0x";
}

function stripHexPrefix(str: string): string {
  if (typeof str !== "string") {
    return str;
  }
  return isHexPrefixed(str) ? str.slice(2) : str;
}

function padToEven(a: string): string {
  return a.length % 2 ? `0${a}` : a;
}

function deserialize(serializedTransaction: string, chainId: number) {
  const optsChain: TxOptions = {
    common: Common.forCustomChain(
      "mainnet",
      {
        name: "ebsi-network",
        networkId: chainId,
        chainId,
      },
      "petersburg"
    ),
  };

  const serialized = isHexPrefixed(serializedTransaction)
    ? Buffer.from(padToEven(stripHexPrefix(serializedTransaction)), "hex")
    : Buffer.from(serializedTransaction);

  try {
    const tx = Transaction.fromSerializedTx(serialized, optsChain);

    return tx.toJSON();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes(`chain id ${chainId}`))
      err.message = `Invalid chain id. Please set chain id to 0x${chainId.toString(
        16
      )}`;
    throw err;
  }
}

export function isDeployingSmartContract(
  query: BesuDto,
  chainId: number
): boolean {
  if (query.method !== "eth_sendRawTransaction" || query.params.length === 0) {
    return false;
  }

  const tx = deserialize(query.params[0], chainId);

  /* deploy when "to" is 0 and there is "data" */
  return (parseInt(tx.to, 16) === 0 || tx.to === "0x") && tx.data !== "0x";
}

export default { isDeployingSmartContract };
