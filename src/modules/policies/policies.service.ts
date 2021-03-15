import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { SchemaSCRegistry } from "../../contracts/trusted-schemas";
import { generateMultihash } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { PolicyRevisions } from "./policies.interface";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private schemasContract: SchemaSCRegistry;

  constructor(
    private contractService: ContractService,
    private configService: ConfigService
  ) {
    this.schemasContract = this.contractService.getContract();
  }

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<SchemaSCRegistry["getPolicies"]> {
    return this.schemasContract.getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<SchemaSCRegistry["getPolicy"]>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await this.schemasContract.getPolicy(policyId);
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
      revisions = await this.schemasContract.getPolicyRevisions(
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
      this.schemasContract.getPolicyByHash(hash)
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
