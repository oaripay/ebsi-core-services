import { IsString, IsNumberString, IsOptional } from "class-validator";

export class ArgsDeletePolicyCondition {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsNumberString()
  policyConditionId!: string;
}

export default { ArgsDeletePolicyCondition };
