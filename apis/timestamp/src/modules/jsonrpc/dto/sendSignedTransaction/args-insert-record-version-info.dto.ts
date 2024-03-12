import { IsInt, Min, IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsInsertRecordVersionInfo {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  recordId!: string;

  @IsInt()
  @Min(0)
  versionId!: number;

  @IsHexadecimalJSON()
  versionInfo!: string;
}

export default { ArgsInsertRecordVersionInfo };
