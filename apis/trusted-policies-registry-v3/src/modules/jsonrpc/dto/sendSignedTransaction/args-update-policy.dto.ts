import { IsString, IsNumberString, IsOptional } from "class-validator";

export class ArgsUpdatePolicy {
  @IsOptional()
  @IsNumberString()
  policyId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsString()
  description!: string;
}

export default { ArgsUpdatePolicy };
