import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaginationQuery,
  PaginatedListWithoutTotal,
} from "@ebsiint-api/shared";
import { PoliciesService } from "./policies.service.js";
import { formatPolicies } from "./policies.formatter.js";
import { PolicyLink, PolicyResponseObject } from "./policies.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetPolicyParams } from "./dto/index.js";

@Controller("/policies")
export class PoliciesController {
  constructor(
    private policiesService: PoliciesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getPolicies(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedListWithoutTotal<PolicyLink>> {
    const policies = await this.policiesService.getPolicyNames(
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/policies`;

    return formatPolicies(
      policies,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:policyName")
  async getPolicy(
    @Param() params: GetPolicyParams,
  ): Promise<PolicyResponseObject> {
    const { policyName } = params;

    return this.policiesService.getPolicy(policyName);
  }
}

export default PoliciesController;
