import { IsInt, IsHexadecimal, IsString, Min, Matches } from "class-validator";

export class ArgsInsertRecordOwner {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  recordId!: string;

  @IsString()
  ownerId!: string;

  @IsInt()
  @Min(0)
  notBefore!: number;

  @IsInt()
  @Min(0)
  notAfter!: number;
}

export default { ArgsInsertRecordOwner };
