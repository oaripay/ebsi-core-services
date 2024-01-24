import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, isEthersError } from "@ebsiint-api/shared";
import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export default class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getDocuments(
    page: number,
    pageSize: number,
  ): ReturnType<TrackAndTrace["getDocuments"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getDocuments(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("No documents found", {
        detail: "No documents found",
      });
    }
  }
}
