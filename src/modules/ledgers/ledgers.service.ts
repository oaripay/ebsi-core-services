import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerSCRegistry } from "../../contracts/trusted-ledgers-sc";

@Injectable()
export class LedgersService {
  private readonly logger = new Logger(LedgersService.name);

  private ledgerScRegistryContract: LedgerSCRegistry;

  constructor(private contractService: ContractService) {
    this.ledgerScRegistryContract = this.contractService.getContract();
  }

  async getLedgers(
    page: number,
    pageSize: number,
    name?: string
  ): ReturnType<LedgerSCRegistry["getLedgerInfoIds"]> {
    if (name) {
      // TODO: filter results by name
      // await this.ledgerScRegistryContract.getLatestLedgerInfoByLedgerName(name);
    }

    return this.ledgerScRegistryContract.getLedgerInfoIds(page, pageSize);
  }

  async getLedger(ledgerInfoId: string): Promise<unknown> {
    let ledgerInfo: AsyncReturnType<
      LedgerSCRegistry["getLatestLedgerInfoById"]
    >;

    try {
      ledgerInfo = await this.ledgerScRegistryContract.getLatestLedgerInfoById(
        ledgerInfoId
      );
    } catch (error) {
      throw new NotFoundError("Ledger Not Found", {
        detail: `Ledger ${ledgerInfoId} not found`,
      });
    }

    const decodedLedgerInfo = JSON.parse(
      Buffer.from(ledgerInfo.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedLedgerInfo;
  }
}

export default LedgersService;
