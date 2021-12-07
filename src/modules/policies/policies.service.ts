import { Injectable, Logger } from "@nestjs/common";
import { LedgerService } from "../../shared/services/ledger.service";
import { PolicyRegistry } from "../../contracts";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<PolicyRegistry["getPolicies"]> {
    return (await this.ledgerService.getContract()).getPolicies(page, pageSize);
  }
}

export default PoliciesService;
