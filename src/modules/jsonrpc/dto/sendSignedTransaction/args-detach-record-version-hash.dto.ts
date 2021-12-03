import { IsInt, IsHexadecimal, Min } from "class-validator";

export class ArgsDetachRecordVersionHash {
  @IsHexadecimal()
  recordId: string;

  @IsInt()
  @Min(0)
  versionId: number;

  @IsHexadecimal()
  hashValue: string;
}

export default { ArgsDetachRecordVersionHash };
