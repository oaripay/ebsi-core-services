import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { LedgerSCRegistry } from "@ebsiint-sc/trusted-ledgers-registry";
import { ContractService } from "../../shared/services/contract.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerInfoIdsList, RevisionsList } from "./ledgers.interface";

@Injectable()
export class LedgersService {
  private readonly logger = new Logger(LedgersService.name);

  constructor(private contractService: ContractService) {}

  async getLedgers(
    page: number,
    pageSize: number,
    name?: string
  ): Promise<LedgerInfoIdsList> {
    if (name) {
      try {
        const ledger = await (
          await this.contractService.getContract()
        ).getLedgerInfoIdByName(name);

        return {
          items: [ledger],
          total: ledger ? 1 : 0,
        };
      } catch (e) {
        return {
          items: [],
          total: 0,
        };
      }
    }

    const result = await (
      await this.contractService.getContract()
    ).getLedgerInfoIds(page, pageSize);

    return {
      items: result.items,
      total: result.total.toNumber(),
    };
  }

  async getLedger(ledgerInfoId: string): Promise<unknown> {
    let ledgerInfo: AsyncReturnType<
      LedgerSCRegistry["getLatestLedgerInfoById"]
    >;

    try {
      ledgerInfo = await (
        await this.contractService.getContract()
      ).getLatestLedgerInfoById(ledgerInfoId);
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

  async getLedgerRevisions(
    ledgerInfoId: string,
    page: number,
    pageSize: number
  ): Promise<RevisionsList> {
    try {
      await (
        await this.contractService.getContract()
      ).getLatestLedgerInfoById(ledgerInfoId);
    } catch (error) {
      throw new NotFoundError("Ledger Not Found", {
        detail: `Ledger ${ledgerInfoId} not found`,
      });
    }

    const result = await (
      await this.contractService.getContract()
    ).getLedgerInfoRevisionIds(ledgerInfoId, page, pageSize);

    return {
      items: result.items,
      total: result.total.toNumber(),
    };
  }

  async getLedgerRevision(
    ledgerInfoId: string,
    revisionHash: string
  ): Promise<unknown> {
    // Make sure it exists
    try {
      await (
        await this.contractService.getContract()
      ).getLatestLedgerInfoById(ledgerInfoId);
    } catch (error) {
      throw new NotFoundError("Ledger Not Found", {
        detail: `Ledger ${ledgerInfoId} not found`,
      });
    }

    let ledgerInfo: AsyncReturnType<
      LedgerSCRegistry["getLedgerInfoByRevisionId"]
    >;

    try {
      ledgerInfo = await (
        await this.contractService.getContract()
      ).getLedgerInfoByRevisionId(revisionHash);

      if (!ledgerInfo || ledgerInfo === "0x") {
        throw new Error("not found");
      }
    } catch (error) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${revisionHash} not found`,
      });
    }

    const decodedLedgerInfo = JSON.parse(
      Buffer.from(ledgerInfo.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedLedgerInfo;
  }
}

export default LedgersService;
