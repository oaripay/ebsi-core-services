import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@ebsiint-api/shared";
import { PolicyResponseObject } from "./policies.interface.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class PoliciesService {
  async getPolicyNames(page = 1, pagesize = 10): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      const res = await sdk.getPolicyNames({ skip, pagesize: queryPageSize });
      const policyNames = res.policies.map((p) => p.policyName);
      return { items: policyNames };
    } catch (error) {
      throw new NotFoundError("Policies not found", {
        detail: `Policies not found`,
      });
    }
  }

  async getPolicy(policyName: string): Promise<PolicyResponseObject> {
    try {
      const res = await sdk.getPolicy({ policyName });
      const policy = res.policies[0];
      if (!policy) throw new Error("not found");

      return {
        policyId: policy.id,
        description: policy.description,
        policyName: policy.policyName,
        status: policy.status,
      };
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyName} not found`,
      });
    }
  }
}

export default PoliciesService;
