import type { ethers } from "ethers";
import type { LedgerService } from "../../src/modules/ledger/ledger.service";

export const waitToBeMined = async (
  ledgerService: LedgerService,
  txId: string
): Promise<ethers.providers.TransactionReceipt> => {
  let mined = false;
  let receipt: ethers.providers.TransactionReceipt;

  /* eslint-disable no-await-in-loop */
  do {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    receipt = await (
      await ledgerService.getContract()
    ).provider.getTransactionReceipt(txId);

    mined = !!receipt;
  } while (!mined);

  return receipt;
};

export default waitToBeMined;
