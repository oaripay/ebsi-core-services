import { IsString, IsArray, IsNumberString, IsOptional } from "class-validator";
import { IsPolicyConditions } from "../../validators";
import { PolicyConditionDto } from "../shared/policy-condition.dto";

export class ArgsAddPolicyConditions {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsArray()
  @IsPolicyConditions({ each: true })
  policyConditions: PolicyConditionDto[];
}

export default { ArgsAddPolicyConditions };
