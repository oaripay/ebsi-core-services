import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { LedgerService } from "../../src/shared/services/ledger.service";

export const waitToBeMined = async (
  ledgerService: LedgerService,
  txId: string
): Promise<TransactionReceipt> => {
  let mined = false;
  let receipt: TransactionReceipt;
  /* eslint-disable no-await-in-loop */
  while (!mined) {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    receipt = await (
      await ledgerService.getContract()
    ).provider.getTransactionReceipt(txId);

    mined = !!receipt;
  }

  return receipt;
};

export default waitToBeMined;
