import { IsNumberString } from "class-validator";

export class ArgsDeletePolicyCondition {
  @IsNumberString()
  policyId: string;

  @IsNumberString()
  policyConditionId: string;
}

export default { ArgsDeletePolicyCondition };
