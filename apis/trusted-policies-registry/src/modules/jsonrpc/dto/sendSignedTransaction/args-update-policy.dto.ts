import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsNumberString,
  IsOptional,
} from "class-validator";
import { OPERATION_TYPES } from "../../../policies/policies.interface";

export class ArgsUpdatePolicy {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsNumber()
  @Min(0)
  @Max(OPERATION_TYPES.length - 1)
  opType: number;

  @IsString()
  description: string;
}

export default { ArgsUpdatePolicy };
