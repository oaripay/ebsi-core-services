import { Type } from "class-transformer";
import { IsArray, ValidateNested, IsNumberString } from "class-validator";
import { PolicyConditionDto } from "../shared/policy-condition.dto";

export class ArgsAddPolicyConditions {
  @IsNumberString()
  policyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyConditionDto)
  policyConditions: PolicyConditionDto[];
}

export default { ArgsAddPolicyConditions };
