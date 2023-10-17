import { IsString, IsArray, IsNumberString, IsOptional } from "class-validator";
import { IsPolicyConditions } from "../../validators/index.js";
import { PolicyConditionDto } from "../shared/policy-condition.dto.js";

export class ArgsAddPolicyConditions {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsArray()
  @IsPolicyConditions({ each: true })
  policyConditions!: PolicyConditionDto[];
}

export default { ArgsAddPolicyConditions };
