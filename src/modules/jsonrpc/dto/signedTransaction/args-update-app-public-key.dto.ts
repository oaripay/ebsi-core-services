import { IsHexadecimal, IsInt, Min, Max } from "class-validator";

export class ArgsUpdateAppPublicKey {
  @IsHexadecimal()
  publicKeyId: string;

  @IsInt()
  @Min(0)
  @Max(2)
  status: number;

  @IsInt()
  notAfter: number;
}

export default { ArgsUpdateAppPublicKey };
