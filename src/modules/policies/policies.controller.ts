import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PoliciesService } from "./policies.service";
import { formatPolicies } from "./policies.formatter";
import { PolicyLink, PolicyResponseObject } from "./policies.interface";
import { PaginationQuery } from "../../shared/dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";
import { GetPolicyParams } from "./dto";

@Controller("/policies")
export class PoliciesController {
  constructor(
    private policiesService: PoliciesService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getPolicies(
    @Query() query: PaginationQuery
  ): Promise<PaginatedList<PolicyLink>> {
    const policies = await this.policiesService.getPolicyNames(
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

  @Get("/:policyName")
  async getPolicy(
    @Param() params: GetPolicyParams
  ): Promise<PolicyResponseObject> {
    const { policyName } = params;

    return this.policiesService.getPolicy(policyName);
  }
}

export default PoliciesController;
