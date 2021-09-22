import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { LedgerService } from "../ledger/ledger.service";
import { DidRegistry } from "../../contracts/did-registry";
import { multihashEncode, multibase } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { PolicyRevisions } from "./policies.interface";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getPolicies"]> {
    return (await this.ledgerService.getContract()).getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    let policy: AsyncReturnType<DidRegistry["getPolicy"]>;

    try {
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

    //  sha2-256 multihash from hash, encoded in mutlibase base16
    const multihash = multibase.base16.encode(
      multihashEncode(rawPolicyHash, "sha2-256", 32)
    );
    return [base64Policy, multihash];
  }

  async getPolicyRevisions(
    policyId: string,
    page: number,
    pageSize: number
  ): Promise<PolicyRevisions> {
    let revisions: AsyncReturnType<DidRegistry["getPolicyRevisions"]>;

    const contract = await this.ledgerService.getContract();

    try {
      revisions = await contract.getPolicyRevisions(policyId, page, pageSize);
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const getPoliciesByRevisions = revisions.items.map((hash) =>
      contract.getPolicyByHash(hash)
    );

    let policies: AsyncReturnType<DidRegistry["getPolicyByHash"]>[];

    try {
      policies = await Promise.all(getPoliciesByRevisions);
    } catch (e) {
      throw new Error("ach");
    }

    return {
      items: revisions.items.map((hash, index) => {
        const base64Policy = Buffer.from(
          policies[index].slice(2),
          "hex"
        ).toString("base64");
        const multihash = multibase.base16.encode(
          multihashEncode(hash, "sha2-256", 32)
        );

        return {
          policyId,
          policy: base64Policy,
          hash: multihash,
        };
      }),
      total: revisions.total.toNumber(),
    };
  }
}

export default PoliciesService;
