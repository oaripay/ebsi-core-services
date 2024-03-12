import { IsHexadecimal, IsInt, Min, Max, Matches } from "class-validator";

export class ArgsUpdateAppPublicKey {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  publicKeyId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  status!: number;
}

export default { ArgsUpdateAppPublicKey };
