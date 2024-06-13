import { Injectable, Logger } from "@nestjs/common";
import { Tar } from "@ebsiint-sc/trusted-apps-registry";
import {
  generateMultihash,
  isEthersError,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { PolicyRevisions } from "./policies.interface.js";
import LedgerService from "../ledger/ledger.service.js";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private tarContract: Tar;

  constructor(private ledgerService: LedgerService) {
    this.tarContract = this.ledgerService.getContract();
  }

  async getPolicies(
    page: number,
    pageSize: number,
  ): ReturnType<Tar["getPolicies"]> {
    return this.tarContract.getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: Awaited<ReturnType<Tar["getPolicy"]>>;

    try {
      policy = await this.tarContract.getPolicy(policyId);
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
    let revisions: Awaited<ReturnType<Tar["getPolicyRevisions"]>>;

    try {
      revisions = await this.tarContract.getPolicyRevisions(
        policyId,
        page,
        pageSize,
      );
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const getPoliciesByRevisions = revisions.items.map((hash) =>
      this.tarContract.getPolicyByHash(hash),
    );

    let policies: Awaited<ReturnType<Tar["getPolicyByHash"]>>[];

    try {
      policies = await Promise.all(getPoliciesByRevisions);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new Error("Failed to fetch policies revisions");
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
