import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import { PoliciesService } from "./policies.service.js";
import { formatPolicies } from "./policies.formatter.js";
import { PolicyLink, PolicyResponseObject } from "./policies.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetPolicyParams, GetPoliciesQuery } from "./dto/index.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { Policy_filter } from "../../../.graphclient/index.js";

@Controller("/policies")
export class PoliciesController {
  constructor(
    private policiesService: PoliciesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

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

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/policies`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof GetPoliciesQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return formatPolicies(
      policies,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
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
