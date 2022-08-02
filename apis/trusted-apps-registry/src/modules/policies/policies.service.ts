import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { Tar } from "@ebsiint-sc/trusted-apps-registry";
import { PolicyRevisions } from "./policies.interface";
import LedgerService from "../ledger/ledger.service";
import { generateMultihash } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private tarContract: Tar;

  constructor(private ledgerService: LedgerService) {
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

  async getPolicyRevisions(
    policyId: string,
    page: number,
    pageSize: number
  ): Promise<PolicyRevisions> {
    let revisions: AsyncReturnType<Tar["getPolicyRevisions"]>;

    try {
      revisions = await this.tarContract.getPolicyRevisions(
        policyId,
        page,
        pageSize
      );
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const getPoliciesByRevisions = revisions.items.map((hash) =>
      this.tarContract.getPolicyByHash(hash)
    );

    let policies: AsyncReturnType<Tar["getPolicyByHash"]>[];

    try {
      policies = await Promise.all(getPoliciesByRevisions);
    } catch (e) {
      throw new Error("ach");
    }

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
