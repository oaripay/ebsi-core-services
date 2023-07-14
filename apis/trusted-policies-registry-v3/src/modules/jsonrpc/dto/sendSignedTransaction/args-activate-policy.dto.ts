import { IsString, IsNumberString, IsOptional } from "class-validator";

export class ArgsActivatePolicy {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;
}

export default { ArgsActivatePolicy };
