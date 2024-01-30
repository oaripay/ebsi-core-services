import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, isEthersError } from "@ebsiint-api/shared";
import { utils } from "ethers";
import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export default class AccessesService {
  private readonly logger = new Logger(AccessesService.name);

  constructor(private ledgerService: LedgerService) {}

  async isCreator(did: string): Promise<void> {
    try {
      const res = await (
        await this.ledgerService.getContract()
      ).isCreator(utils.toUtf8Bytes(did));
      if (!res) throw new Error();
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Creator Not Found", {
        detail: `${did} is not allowlisted as a creator`,
      });
    }
  }
}
