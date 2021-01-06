import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import { Tar } from "../../contracts/Tar";
import { generateMultihash } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private tarContract: Tar;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tarContract = this.ledgerService.getContract();
  }

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<Tar["getPolicies"]> {
    return this.tarContract.getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<Tar["getPolicy"]>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await this.tarContract.getPolicy(policyId);
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const [rawPolicy, rawPolicyHash] = policy;

    const base64Policy = Buffer.from(rawPolicy.slice(2), "hex").toString(
      "base64"
    );

    // Compute multihash from hash
    const multihash = generateMultihash(rawPolicyHash);
    return [base64Policy, multihash];
  }
}
