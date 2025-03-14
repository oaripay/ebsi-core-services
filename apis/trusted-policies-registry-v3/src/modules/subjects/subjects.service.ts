import type { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";

import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry-v2";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.ts";

import { LedgerService } from "../ledger/ledger.service.ts";

@Injectable()
export class SubjectsService {
  private readonly contract: PolicyRegistry;

  private readonly logger = new Logger(SubjectsService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    const contractAddress = configService.get("contractAddr", { infer: true });
    this.contract = PolicyRegistry__factory.connect(contractAddress);
  }

  async getSubject(user: string): Promise<boolean> {
    try {
      await this.getSubjectPolicies(user, 1, 1);
      return true;
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Subject Not Found", {
        detail: `Subject ${user} not found:`,
      });
    }
  }

  async getSubjectPolicies(
    user: string,
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getUserAttributes"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getUserAttributes(user, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Subject Policies Not Found", {
        detail: `"Subject Policies Not Found"`,
      });
    }
  }

  async getSubjects(
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getUsers"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getUsers(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Subjects Not Found", {
        detail: "Subjects Not Found",
      });
    }
  }

  async isSubjectPolicy(
    user: string,
    policyName: string,
  ): ReturnType<PolicyRegistry["isUserAttribute"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .isUserAttribute(user, policyName);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Subject Not Found", {
        detail: "Subject Not Found",
      });
    }
  }
}
