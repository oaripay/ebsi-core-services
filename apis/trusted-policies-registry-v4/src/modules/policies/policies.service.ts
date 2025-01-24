import { NotFoundError } from "@ebsiint-api/shared";
import { Injectable } from "@nestjs/common";

import type { Policy_filter } from "../../../.graphclient/index.js";
import type { PolicyResponseObject } from "./policies.interface.js";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class PoliciesService {
  async getPolicy(policyName: string): Promise<PolicyResponseObject> {
    try {
      const res = await sdk.GetPolicy({ policyName });
      const policy = res.policies[0];
      if (!policy) throw new Error("not found");

      return {
        description: policy.description,
        policyId: policy.id,
        policyName: policy.policyName,
        status: policy.status,
      };
    } catch {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyName} not found`,
      });
    }
  }

  async getPolicyNames(
    page = 1,
    pagesize = 10,
    where: Policy_filter = {},
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      const res = await sdk.GetPolicyNames({
        pagesize: queryPageSize,
        skip,
        where,
      });
      if (!res.policies) return { items: [] };
      const policyNames = res.policies.map((p) => p.policyName);
      return { items: policyNames };
    } catch {
      throw new NotFoundError("Policies not found", {
        detail: `Policies not found`,
      });
    }
  }
}

export default PoliciesService;
