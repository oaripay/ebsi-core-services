import { Injectable, Logger } from "@nestjs/common";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";
import {
  generateMultihash,
  NotFoundError,
  isEthersError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import { PolicyRevisions } from "./policies.interface.js";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicies(
    page: number,
    pageSize: number,
  ): ReturnType<SchemaSCRegistry["getPolicies"]> {
    try {
      return await this.ledgerService.getContract().getPolicies(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Policies Not Found", {
        detail: `Policies not found`,
      });
    }
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: Awaited<ReturnType<SchemaSCRegistry["getPolicy"]>>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await this.ledgerService.getContract().getPolicy(policyId);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const [rawPolicy, rawPolicyHash] = policy;

    const base64Policy = Buffer.from(remove0xPrefix(rawPolicy), "hex").toString(
      "base64",
    );

    // Compute multihash from hash
    const multihash = generateMultihash(rawPolicyHash);
    return [base64Policy, multihash];
  }

  async getPolicyRevisions(
    policyId: string,
    page: number,
    pageSize: number,
  ): Promise<PolicyRevisions> {
    let revisions: Awaited<ReturnType<SchemaSCRegistry["getPolicyRevisions"]>>;

    try {
      revisions = await this.ledgerService
        .getContract()
        .getPolicyRevisions(policyId, page, pageSize);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const contract = this.ledgerService.getContract();
    const getPoliciesByRevisions = revisions.items.map((hash) =>
      contract.getPolicyByHash(hash),
    );

    let policies: Awaited<ReturnType<SchemaSCRegistry["getPolicyByHash"]>>[];

    try {
      policies = await Promise.all(getPoliciesByRevisions);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Revisions not found", {
        detail: `Revisions for ${policyId} not found`,
      });
    }

    return {
      items: revisions.items.map((hash, index) => ({
        policyId,
        policy: policies[index]!,
        hash,
      })),
      total: revisions.total.toNumber(),
    };
  }
}

export default PoliciesService;
