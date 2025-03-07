import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Policy_filter } from "../../../.graphclient/index.js";
import type { ApiConfig } from "../../config/configuration.ts";
import type { PolicyLink, PolicyResponseObject } from "./policies.interface.ts";

import { GetPoliciesQuery, GetPolicyParams } from "./dto/index.ts";
import { formatPolicies } from "./policies.formatter.ts";
import { PoliciesService } from "./policies.service.ts";

@Controller("/policies")
export class PoliciesController {
  constructor(
    private policiesService: PoliciesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("")
  async getPolicies(
    @Query() query: GetPoliciesQuery,
  ): Promise<PaginatedListWithoutTotal<PolicyLink>> {
    const where: Policy_filter = {
      ...(query.status && {
        status: query.status === "true",
      }),
    };

    const policies = await this.policiesService.getPolicyNames(
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/policies`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetPoliciesQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatPolicies(
      policies,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
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
