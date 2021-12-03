import { IsHexadecimal, IsInt, Min, Max } from "class-validator";

export class ArgsUpdateAppPublicKey {
  @IsHexadecimal()
  publicKeyId: string;

  @IsInt()
  @Min(0)
  @Max(3)
  status: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsUpdateAppPublicKey };
