import { IsString, IsHexadecimal } from "class-validator";

export default class ArgsUpdatePolicy {
  @IsString()
  policyId: string;

  @IsHexadecimal()
  policyData: string;
}
