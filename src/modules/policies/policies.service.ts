import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  InternalServerError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { PolicyRegistry } from "../../contracts";
import { LedgerService } from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
  PolicyResponseObject,
} from "./policies.interface";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private ledgerService: LedgerService) {}

  formatValue(value: ethers.BytesLike, typeOfValue: number): string | boolean {
    const type = ATTRIBUTE_TYPES[typeOfValue];

    if (typeof value !== "string") {
      this.logger.error(`Unable to process value of type ${typeof value}`);
      throw new InternalServerError();
    }

    switch (type) {
      case "STRING": {
        // Decode hex -> utf-8
        return Buffer.from(value.replace(/^0x/, ""), "hex").toString("utf-8");
      }
      case "UINT256": {
        // Decode hex -> integer
        return ethers.BigNumber.from(value).toString();
      }
      case "BOOLEAN": {
        // 0x00 = false, 0x01 = true
        if (value === "0x00") return false;
        if (value === "0x01") return true;

        this.logger.error(`Unrecognized BOOLEAN with value: ${value}`);
        throw new InternalServerError();
      }
      case "ADDRESS":
      case "BYTES":
      case "BYTES32": {
        // Return hex value, unchanged
        return value;
      }
      default: {
        this.logger.error(`Unsupported type ${typeOfValue}`);
        throw new InternalServerError();
      }
    }
  }

  async getPolicies(
    page: number,
    pageSize: number
  ): ReturnType<PolicyRegistry["getPolicies"]> {
    return (await this.ledgerService.getContract()).getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<PolicyResponseObject> {
    let policy: AsyncReturnType<PolicyRegistry["getPolicy"]>;

    try {
      policy = await (
        await this.ledgerService.getContract()
      ).getPolicy(policyId);
    } catch (e) {
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    return {
      policyId,
      registry: policy.registry,
      policyName: policy.policyName,
      operationType: OPERATION_TYPES[policy.opType],
      status: policy.status,
      policyConditions: policy.policyConditions.map((condition) => ({
        name: condition.name,
        attributeName: condition.attributeName,
        typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
        value: this.formatValue(condition.value, condition.typeOfValue),
        attributeOperation: ATTRIBUTE_OPERATIONS[condition.attributeOperation],
      })),
    };
  }
}

export default PoliciesService;
