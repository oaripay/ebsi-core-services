import {
  InternalServerError,
  isEthersError,
  NotFoundError,
} from "@ebsiint-api/shared";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import { LedgerService } from "../ledger/ledger.service.js";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
  PolicyResponseObject,
} from "./policies.interface.js";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  formatValue(value: ethers.BytesLike, typeOfValue: number): boolean | string {
    const type = ATTRIBUTE_TYPES[typeOfValue];

    if (typeof value !== "string") {
      this.logger.error(`Unable to process value of type ${typeof value}`);
      throw new InternalServerError();
    }

    switch (type) {
      case "BOOLEAN": {
        if (value === `0x${"00".repeat(32)}`) return false;
        if (value === `0x${"00".repeat(31)}01`) return true;

        this.logger.error(`Unrecognized BOOLEAN with value: ${value}`);
        throw new InternalServerError();
      }
      case "ADDRESS":
      case "BYTES":
      case "BYTES32": {
        // Return hex value, unchanged
        return value;
      }
      case "STRING": {
        // Decode hex -> utf-8
        return Buffer.from(value.replace(/^0x/, ""), "hex").toString("utf8");
      }
      case "UINT256": {
        // Decode hex -> integer
        return ethers.BigNumber.from(value).toString();
      }
      default: {
        this.logger.error(`Unsupported type ${typeOfValue}`);
        throw new InternalServerError();
      }
    }
  }

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
      operationType: OPERATION_TYPES[policy.opType]!,
      policyConditions: policy.policyConditions.map((condition) => ({
        attributeName: condition.attributeName,
        attributeOperation: ATTRIBUTE_OPERATIONS[condition.attributeOperation]!,
        name: condition.name,
        typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue]!,
        value: this.formatValue(condition.value, condition.typeOfValue),
      })),
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
