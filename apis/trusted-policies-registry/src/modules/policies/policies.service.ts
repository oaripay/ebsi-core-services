import type { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";

import {
  InternalServerError,
  isEthersError,
  NotFoundError,
} from "@ebsiint-api/shared";
import { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

import type { ApiConfig } from "../../config/configuration.ts";
import type { PolicyResponseObject } from "./policies.interface.ts";

import { LedgerService } from "../ledger/ledger.service.ts";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "./policies.constants.ts";

@Injectable()
export class PoliciesService {
  private readonly contract: PolicyRegistry;

  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    const contractAddress = configService.get("contractAddr", { infer: true });
    this.contract = PolicyRegistry__factory.connect(contractAddress);
  }

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
        return BigInt(value).toString();
      }
      default: {
        this.logger.error(`Unsupported type ${typeOfValue}`);
        throw new InternalServerError();
      }
    }
  }

  async getPolicy(policyName: string): Promise<PolicyResponseObject> {
    const provider = this.ledgerService.getProvider();

    let policy: Awaited<ReturnType<PolicyRegistry["getPolicy(string)"]>>;

    try {
      policy = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
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
      operationType: OPERATION_TYPES[Number(policy.opType)]!,
      policyConditions: policy.policyConditions.map((condition) => ({
        attributeName: condition.attributeName,
        attributeOperation:
          ATTRIBUTE_OPERATIONS[Number(condition.attributeOperation)]!,
        name: condition.name,
        typeOfValue: ATTRIBUTE_TYPES[Number(condition.typeOfValue)]!,
        value: this.formatValue(condition.value, Number(condition.typeOfValue)),
      })),
      policyId: BigInt(policy.policyId).toString(),
      policyName: policy.policyName,
      status: policy.status,
    };
  }

  async getPolicyNames(
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getPolicyNames"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
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
