import { IsString, IsNumberString, IsOptional } from "class-validator";

export class ArgsDeactivatePolicy {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;
}

export default { ArgsDeactivatePolicy };
