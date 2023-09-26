import axios from "axios";
import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { parseRevertReason } from "./parseRevertReason";

export interface TransactionReceiptBesu extends TransactionReceipt {
  revertReason: string;
}

async function getTransactionReceipt(
  url: string,
  txId: string
): Promise<TransactionReceiptBesu> {
  const { data } = await axios.post<{
    result: TransactionReceiptBesu;
  }>(url, {
    jsonrpc: "2.0",
    method: "eth_getTransactionReceipt",
    params: [txId],
  });
  if (data.result) data.result.status = Number(data.result.status);
  return data.result;
}

export const waitToBeMined = async (
  url: string,
  txId: string
): Promise<TransactionReceiptBesu> => {
  let mined = false;
  let receipt: TransactionReceiptBesu;

  /* eslint-disable no-await-in-loop */
  do {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    receipt = await getTransactionReceipt(url, txId);
    mined = !!receipt;
  } while (!mined);

  if (receipt.revertReason)
    receipt.revertReason = parseRevertReason(receipt.revertReason);

  return receipt;
};

export default waitToBeMined;
