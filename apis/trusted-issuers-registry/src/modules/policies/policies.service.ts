import { Injectable, Logger } from "@nestjs/common";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import {
  generateMultihash,
  AsyncReturnType,
  NotFoundError,
} from "@ebsiint-api/shared";
import { PolicyRevisions } from "./policies.interface";
import { LedgerService } from "../ledger/ledger.service";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<Tir["getPolicies"]> {
    return (await this.ledgerService.getContract()).getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<Tir["getPolicy"]>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await (
        await this.ledgerService.getContract()
      ).getPolicy(policyId);
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

  async getPolicyRevisions(
    policyId: string,
    page: number,
    pageSize: number
  ): Promise<PolicyRevisions> {
    let revisions: AsyncReturnType<Tir["getPolicyRevisions"]>;

    try {
      revisions = await (
        await this.ledgerService.getContract()
      ).getPolicyRevisions(policyId, page, pageSize);
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const contract = await this.ledgerService.getContract();
    const getPoliciesByRevisions = revisions.items.map((hash) =>
      contract.getPolicyByHash(hash)
    );

    const policies = await Promise.all(getPoliciesByRevisions);

    return {
      items: revisions.items.map((hash, index) => ({
        policyId,
        policy: policies[index],
        hash,
      })),
      total: revisions.total.toNumber(),
    };
  }
}

export default PoliciesService;
