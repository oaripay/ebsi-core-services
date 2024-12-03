import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import { LedgerService } from "../ledger/ledger.service.js";
import { PolicyResponseObject } from "./policies.interface.js";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicy(policyName: string): Promise<PolicyResponseObject> {
    let policy: Awaited<ReturnType<PolicyRegistry["getPolicy(string)"]>>;

    try {
      policy = await this.ledgerService
        .getContract()
        ["getPolicy(string)"](policyName);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error.message, error.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyName} not found`,
      });
    }

    return {
      description: policy.description,
      policyId: ethers.BigNumber.from(policy.policyId).toString(),
      policyName: policy.policyName,
      status: policy.status,
    };
  }

  async getPolicyNames(
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getPolicyNames"]> {
    try {
      return await this.ledgerService
        .getContract()
        .getPolicyNames(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error.message, error.stack);
      }
      throw new NotFoundError("Policies not found", {
        detail: "Policies not found",
      });
    }
  }
}

export default PoliciesService;
