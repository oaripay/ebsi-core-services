import { IsString, IsHexadecimal } from "class-validator";

export class ArgsInsertPolicy {
  @IsString()
  policyId!: string;

  @IsHexadecimal()
  policyData!: string;
}

export default ArgsInsertPolicy;
