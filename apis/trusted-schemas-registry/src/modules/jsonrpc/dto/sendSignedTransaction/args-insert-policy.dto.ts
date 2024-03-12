import { IsString, IsHexadecimal, Matches } from "class-validator";

export class ArgsInsertPolicy {
  @IsString()
  policyId!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  policyData!: string;
}

export default { ArgsInsertPolicy };
