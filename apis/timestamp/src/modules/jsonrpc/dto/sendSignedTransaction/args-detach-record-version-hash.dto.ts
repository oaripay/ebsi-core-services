import { IsInt, IsHexadecimal, Min, Matches } from "class-validator";

export class ArgsDetachRecordVersionHash {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  recordId!: string;

  @IsInt()
  @Min(0)
  versionId!: number;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  hashValue!: string;
}

export default { ArgsDetachRecordVersionHash };
