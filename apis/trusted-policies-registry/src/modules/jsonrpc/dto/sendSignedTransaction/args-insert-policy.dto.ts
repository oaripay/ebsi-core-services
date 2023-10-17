import { IsString, IsNumber, IsArray, Min, Max } from "class-validator";
import { PolicyConditionDto } from "../shared/policy-condition.dto.js";
import { OPERATION_TYPES } from "../../../policies/policies.interface.js";
import { IsPolicyConditions } from "../../validators/index.js";

export class ArgsInsertPolicy {
  @IsNumber()
  @Min(0)
  @Max(OPERATION_TYPES.length - 1)
  opType!: number;

  @IsArray()
  @IsPolicyConditions({ each: true })
  policyConditions!: PolicyConditionDto[];

  @IsString()
  policyName!: string;

  @IsString()
  description!: string;
}

export default { ArgsInsertPolicy };
