import { IsHexadecimal, IsInt, Min, Max, Matches } from "class-validator";

export class ArgsInsertAppPublicKey {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  applicationId!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  publicKey!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  status!: number;

  @IsInt()
  @Min(0)
  notBefore!: number;

  @IsInt()
  @Min(0)
  notAfter!: number;
}

export default { ArgsInsertAppPublicKey };
