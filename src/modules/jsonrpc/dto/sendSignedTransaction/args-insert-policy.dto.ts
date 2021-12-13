import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { PolicyConditionDto } from "../shared/policy-condition.dto";
import { OPERATION_TYPES } from "../../../policies/policies.interface";

export class ArgsInsertPolicy {
  @IsNumber()
  @Min(0)
  @Max(OPERATION_TYPES.length - 1)
  opType: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyConditionDto)
  policyConditions: PolicyConditionDto[];

  @IsString()
  policyName: string;

  @IsString()
  registry: string;
}

export default { ArgsInsertPolicy };
