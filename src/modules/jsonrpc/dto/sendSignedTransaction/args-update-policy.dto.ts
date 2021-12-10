import { IsString, IsNumber, Min, Max, IsNumberString } from "class-validator";
import { OPERATION_TYPES } from "../../../policies/policies.interface";

export class ArgsUpdatePolicy {
  @IsNumberString()
  policyId: string;

  @IsNumber()
  @Min(0)
  @Max(OPERATION_TYPES.length - 1)
  opType: number;

  @IsString()
  policyName: string;

  @IsString()
  registry: string;
}

export default { ArgsUpdatePolicy };
