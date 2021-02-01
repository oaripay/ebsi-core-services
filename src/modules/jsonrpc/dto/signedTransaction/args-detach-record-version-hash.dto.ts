import { IsInt, IsHexadecimal } from "class-validator";

export class ArgsDetachRecordVersionHash {
  @IsHexadecimal()
  recordId: string;

  @IsInt()
  versionId: number;

  @IsHexadecimal()
  hashValue: string;
}

export default { ArgsDetachRecordVersionHash };
