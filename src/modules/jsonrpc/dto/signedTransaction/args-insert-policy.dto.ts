import { IsString, IsHexadecimal } from "class-validator";

export default class ArgsInsertPolicy {
  @IsString()
  policyId: string;

  @IsHexadecimal()
  policyData: string;
}
