import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import PoliciesService from "./policies.service";
import { formatPolicies } from "./policies.formatter";
import { PolicyResponseObject, PolicyLink } from "./policies.interface";
import PaginationQuery from "../../shared/dto/pagination-query";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/policies")
export default class PoliciesController {
  constructor(
    private policiesService: PoliciesService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getPolicies(
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<PolicyLink>> {
    const policies = await this.policiesService.getPolicies(
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/policies`;

    return formatPolicies(
      policies,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:policyId")
  async getPolicy(
    @Param() params: { policyId?: string }
  ): Promise<PolicyResponseObject> {
    const { policyId } = params;

    const [policy, hash] = await this.policiesService.getPolicy(policyId);

    return {
      policyId,
      policy,
      hash,
    };
  }
}
