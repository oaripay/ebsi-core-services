import { Transaction } from "@ethereumjs/tx";
import Common from "@ethereumjs/common";
import axios from "axios";
import mem from "mem";
import { BesuDto } from "./dto";
import { BesuResponseObject } from "./besu.interface";

async function getChainId(besuRpcNode: string): Promise<number> {
  try {
    const response = await axios.post<BesuResponseObject>(besuRpcNode, {
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
      id: 1,
    });

    return response.data.result as number;
  } catch (error: unknown) {
    throw new Error(`Error getting EBSI chainId: ${(error as Error).message}`);
  }
}

const memoizedGetChainId = mem(getChainId);

async function deserialize(serializedTransaction, besuRpcNode) {
  const chainId = await memoizedGetChainId(besuRpcNode);
  const optsChain = {
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
    const tx = Transaction.fromRlpSerializedTx(
      serializedTransaction,
      optsChain
    );

    return tx.toJSON();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes(`chain id ${chainId}`))
      err.message = `Invalid chain id. Please set chain id to ${chainId}`;
    throw err;
  }
}

export async function isDeployingSmartContract(
  query: BesuDto,
  besuRpcNode: string
): Promise<boolean> {
  if (query.method !== "eth_sendRawTransaction" || query.params.length === 0) {
    return false;
  }

  const tx = await deserialize(query.params[0], besuRpcNode);

  /* deploy when "to" is 0 and there is "data" */
  return (parseInt(tx.to, 16) === 0 || tx.to === "0x") && tx.data !== "0x";
}

export default { isDeployingSmartContract };
