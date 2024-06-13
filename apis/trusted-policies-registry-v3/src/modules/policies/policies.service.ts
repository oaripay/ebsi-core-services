import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import { PolicyResponseObject } from "./policies.interface.js";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPolicyNames(
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getPolicyNames"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getPolicyNames(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error.message, error.stack);
      }
      throw new NotFoundError("Policies not found", {
        detail: "Policies not found",
      });
    }
  }

  async getPolicy(policyName: string): Promise<PolicyResponseObject> {
    let policy: Awaited<ReturnType<PolicyRegistry["getPolicy(string)"]>>;

    try {
      policy = await (
        await this.ledgerService.getContract()
      )["getPolicy(string)"](policyName);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e.message, e.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyName} not found`,
      });
    }

    return {
      policyId: ethers.BigNumber.from(policy.policyId).toString(),
      description: policy.description,
      policyName: policy.policyName,
      status: policy.status,
    };
  }
}

export default PoliciesService;
