import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { ContractService } from "../../src/shared/services/contract.service";

export const waitToBeMined = async (
  contractService: ContractService,
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
      await contractService.getContract()
    ).provider.getTransactionReceipt(txId);

    mined = !!receipt;
  }

  return receipt;
};

export default waitToBeMined;
