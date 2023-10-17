import { IsInt, Min, IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsInsertRecordVersionInfo {
  @IsHexadecimal()
  recordId!: string;

  @IsInt()
  @Min(0)
  versionId!: number;

  @IsHexadecimalJSON()
  versionInfo!: string;
}

export default { ArgsInsertRecordVersionInfo };
