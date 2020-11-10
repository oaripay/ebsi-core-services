import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { PolicyRevisions } from "./policies.interface";
import LedgerService from "../../shared/services/ledger.service";
import { TrustedIssuersRegistryContract } from "../../shared/types/trusted-issuers-registry.interface";
import { generateMultihash } from "../../shared/utils/multihash.utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private tirContract: TrustedIssuersRegistryContract;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tirContract = (this.ledgerService.getContract() as unknown) as TrustedIssuersRegistryContract;
  }

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<TrustedIssuersRegistryContract["getPolicies"]> {
    return this.tirContract.getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<TrustedIssuersRegistryContract["getPolicy"]>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await this.tirContract.getPolicy(policyId);
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
    let revisions: AsyncReturnType<
      TrustedIssuersRegistryContract["getPolicyRevisions"]
    >;

    try {
      revisions = await this.tirContract.getPolicyRevisions(
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
      this.tirContract.getPolicyByHash(hash)
    );

    let policies: AsyncReturnType<
      TrustedIssuersRegistryContract["getPolicyByHash"]
    >[];

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
