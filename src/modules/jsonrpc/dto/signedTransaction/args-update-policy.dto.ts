import { IsString, IsHexadecimal } from "class-validator";

export class ArgsUpdatePolicy {
  @IsString()
  policyId: string;

  @IsHexadecimal()
  policyData: string;
}

export default ArgsUpdatePolicy;
