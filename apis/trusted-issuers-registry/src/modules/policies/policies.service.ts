import { Injectable, Logger } from "@nestjs/common";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import {
  generateMultihash,
  NotFoundError,
  isEthersError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { PolicyRevisions } from "./policies.interface.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicies(
    page: number,
    pageSize: number,
  ): ReturnType<Tir["getPolicies"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getPolicies(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("No policies found", {
        detail: "No policies found",
      });
    }
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: Awaited<ReturnType<Tir["getPolicy"]>>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await (
        await this.ledgerService.getContract()
      ).getPolicy(policyId);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e);
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
    let revisions: Awaited<ReturnType<Tir["getPolicyRevisions"]>>;

    try {
      revisions = await (
        await this.ledgerService.getContract()
      ).getPolicyRevisions(policyId, page, pageSize);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const contract = await this.ledgerService.getContract();
    const getPoliciesByRevisions = revisions.items.map((hash) =>
      contract.getPolicyByHash(hash),
    );

    try {
      const policies = await Promise.all(getPoliciesByRevisions);

      return {
        items: revisions.items.map((hash, index) => ({
          policyId,
          policy: policies[index]!,
          hash,
        })),
        total: revisions.total.toNumber(),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Policy revisions not found", {
        detail: `Policy revisions for ${policyId} not found`,
      });
    }
  }
}

export default PoliciesService;
