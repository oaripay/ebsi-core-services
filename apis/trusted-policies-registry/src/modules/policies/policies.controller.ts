import { Accepts, PaginatedList, PaginationQuery } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";

import { GetPolicyParams } from "./dto/index.js";
import { formatPolicies } from "./policies.formatter.js";
import { PolicyLink, PolicyResponseObject } from "./policies.interface.js";
import { PoliciesService } from "./policies.service.js";

@Controller("/policies")
export class PoliciesController {
  constructor(
    private policiesService: PoliciesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("")
  async getPolicies(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedList<PolicyLink>> {
    const policies = await this.policiesService.getPolicyNames(
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/policies`;

    return formatPolicies(
      policies,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Accepts("application/json")
  @Get("/:policyName")
  async getPolicy(
    @Param() params: GetPolicyParams,
  ): Promise<PolicyResponseObject> {
    const { policyName } = params;

    return this.policiesService.getPolicy(policyName);
  }
}

export default PoliciesController;
