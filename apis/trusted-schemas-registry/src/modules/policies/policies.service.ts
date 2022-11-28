import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";
import { generateMultihash, AsyncReturnType } from "@ebsiint-api/shared";
import { ContractService } from "../contract/contract.service";
import { PolicyRevisions } from "./policies.interface";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private contractService: ContractService) {}

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<SchemaSCRegistry["getPolicies"]> {
    return (await this.contractService.getContract()).getPolicies(
      page,
      pageSize
    );
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<SchemaSCRegistry["getPolicy"]>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await (
        await this.contractService.getContract()
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
    let revisions: AsyncReturnType<SchemaSCRegistry["getPolicyRevisions"]>;

    try {
      revisions = await (
        await this.contractService.getContract()
      ).getPolicyRevisions(policyId, page, pageSize);
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const contract = await this.contractService.getContract();
    const getPoliciesByRevisions = revisions.items.map((hash) =>
      contract.getPolicyByHash(hash)
    );

    let policies: AsyncReturnType<SchemaSCRegistry["getPolicyByHash"]>[];

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
