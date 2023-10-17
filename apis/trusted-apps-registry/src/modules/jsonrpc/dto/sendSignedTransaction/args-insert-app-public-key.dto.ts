import { IsHexadecimal, IsInt, Min, Max } from "class-validator";

export class ArgsInsertAppPublicKey {
  @IsHexadecimal()
  applicationId!: string;

  @IsHexadecimal()
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
