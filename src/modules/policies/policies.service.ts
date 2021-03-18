import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { DidRegistry } from "../../contracts/did-registry";
import { generateMultihash } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private didRegistryContract: DidRegistry;

  constructor(private contractService: ContractService) {
    this.didRegistryContract = this.contractService.getContract();
  }

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getPolicies"]> {
    return this.didRegistryContract.getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<DidRegistry["getPolicy"]>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await this.didRegistryContract.getPolicy(policyId);
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
