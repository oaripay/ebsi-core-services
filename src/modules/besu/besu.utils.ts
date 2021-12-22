import { Transaction, TxOptions } from "@ethereumjs/tx";
import Common from "@ethereumjs/common";
import { BesuDto } from "./dto";

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

  try {
    const tx = Transaction.fromSerializedTx(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      serializedTransaction,
      optsChain
    );

    return tx.toJSON();
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message.includes(`chain id ${chainId}`)) {
      err.message = `Invalid chain id. Please set chain id to 0x${chainId.toString(
        16
      )}`;
    }

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
